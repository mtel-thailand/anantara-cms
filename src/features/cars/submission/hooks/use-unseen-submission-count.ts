"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { logger } from "@/src/lib/logger";
import { createClient } from "@/src/lib/supabase/client";
import { DEFAULT_EXCLUDED_SUBMISSION_STATUSES } from "@/src/features/cars/submission/submission.types";

const SUBMISSION_VEHICLES_TABLE = "car_submission_vehicles";

export function useUnseenSubmissionCount() {
  const supabase = useMemo(() => createClient(), []);
  const [submissionSeenCount, setSubmissionSeenCount] = useState(0);
  const [submissionTrigger, setSubmissionTrigger] = useState(0);
  const requestSequence = useRef(0);
  const submissionCount = useRef<number | null>(null);

  const refreshCount = useCallback(async () => {
    const request = ++requestSequence.current;
    const [seenResult, countResult] = await Promise.all([
      supabase
        .from(SUBMISSION_VEHICLES_TABLE)
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .is("archived_at", null)
        .not(
          "status",
          "in",
          `(${DEFAULT_EXCLUDED_SUBMISSION_STATUSES.join(",")})`,
        )
        .eq("seen", false),
      supabase
        .from(SUBMISSION_VEHICLES_TABLE)
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .is("archived_at", null)
        .not(
          "status",
          "in",
          `(${DEFAULT_EXCLUDED_SUBMISSION_STATUSES.join(",")})`,
        ),
    ]);

    if (seenResult.error || countResult.error) {
      logger.error("CAR-SUBMISSIONS", "Failed to count unseen submissions", {
        countError: countResult.error?.message,
        seenError: seenResult.error?.message,
      });
      return;
    }

    if (request === requestSequence.current) {
      const nextSubmissionCount = countResult.count ?? 0;

      if (
        submissionCount.current !== null &&
        submissionCount.current !== nextSubmissionCount
      ) {
        setSubmissionTrigger((current) => current + 1);
      }

      submissionCount.current = nextSubmissionCount;
      setSubmissionSeenCount(seenResult.count ?? 0);
    }
  }, [supabase]);

  useEffect(() => {
    void refreshCount();

    const channel = supabase
      .channel("sidebar-unseen-car-submissions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: SUBMISSION_VEHICLES_TABLE,
        },
        () => void refreshCount(),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          logger.warn("CAR-SUBMISSIONS", "Unseen count channel unavailable", {
            status,
          });
        }
      });

    return () => {
      requestSequence.current += 1;
      submissionCount.current = null;
      void supabase.removeChannel(channel);
    };
  }, [refreshCount, supabase]);

  return { submissionSeenCount, submissionTrigger };
}
