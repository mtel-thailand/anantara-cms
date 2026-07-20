"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { logger } from "@/src/lib/logger";
import { createClient } from "@/src/lib/supabase/client";
import { DEFAULT_EXCLUDED_SUBMISSION_STATUSES } from "@/src/features/cars/submission/submission-types";

const SUBMISSION_VEHICLES_TABLE = "car_submission_vehicles";

export function useUnseenSubmissionCount() {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState(0);
  const requestSequence = useRef(0);

  const refreshCount = useCallback(async () => {
    const request = ++requestSequence.current;
    const { count: nextCount, error } = await supabase
      .from(SUBMISSION_VEHICLES_TABLE)
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .is("archived_at", null)
      .not(
        "status",
        "in",
        `(${DEFAULT_EXCLUDED_SUBMISSION_STATUSES.join(",")})`,
      )
      .eq("seen", false);

    if (error) {
      logger.error("CAR-SUBMISSIONS", "Failed to count unseen submissions", {
        error: error.message,
      });
      return;
    }

    if (request === requestSequence.current) {
      setCount(nextCount ?? 0);
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
      void supabase.removeChannel(channel);
    };
  }, [refreshCount, supabase]);

  return count;
}
