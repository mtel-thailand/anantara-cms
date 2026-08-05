"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { logger } from "@/src/lib/logger";
import { createClient } from "@/src/lib/supabase/client";

const OWNER_RESERVATIONS_TABLE = "owner_reservations";
const SUBMISSION_VEHICLES_TABLE = "car_submission_vehicles";

export function useUnseenReservationFormCount() {
  const supabase = useMemo(() => createClient(), []);
  const [reservationSeenCount, setReservationSeenCount] = useState(0);
  const requestSequence = useRef(0);
  const ownerReservationCount = useRef<number | null>(null);
  const [reservationTrigger, setReservationTrigger] = useState<number>(0);

  const refreshCount = useCallback(async () => {
    const request = ++requestSequence.current;
    const [ownerResult, ownerCountResult, vehicleResult] = await Promise.all([
      supabase
        .from(OWNER_RESERVATIONS_TABLE)
        .select("id, car_submissions_form!inner(id)", {
          count: "exact",
          head: true,
        })
        .eq("seen", false)
        .is("deleted_at", null),
      supabase
        .from(OWNER_RESERVATIONS_TABLE)
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      supabase
        .from(SUBMISSION_VEHICLES_TABLE)
        .select("id", { count: "exact", head: true })
        .eq("seen", false)
        .eq("status", "approved")
        .is("deleted_at", null)
        .is("archived_at", null),
    ]);

    if (ownerResult.error || ownerCountResult.error || vehicleResult.error) {
      logger.error(
        "CAR-RESERVATION-FORMS",
        "Failed to count unseen reservation forms",
        {
          ownerError: ownerResult.error?.message,
          ownerCountError: ownerCountResult.error?.message,
          vehicleError: vehicleResult.error?.message,
        },
      );
      return;
    }

    if (request === requestSequence.current) {
      const nextOwnerReservationCount = ownerCountResult.count ?? 0;

      if (
        ownerReservationCount.current !== null &&
        ownerReservationCount.current !== nextOwnerReservationCount
      ) {
        setReservationTrigger((current) => current + 1);
      }

      ownerReservationCount.current = nextOwnerReservationCount;
      setReservationSeenCount(
        (ownerResult.count ?? 0) + (vehicleResult.count ?? 0),
      );
    }
  }, [supabase]);

  useEffect(() => {
    void refreshCount();

    const channel = supabase
      .channel("sidebar-unseen-car-reservation-forms")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: OWNER_RESERVATIONS_TABLE,
        },
        () => void refreshCount(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: SUBMISSION_VEHICLES_TABLE },
        () => void refreshCount(),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          logger.warn(
            "CAR-RESERVATION-FORMS",
            "Unseen form count channel unavailable",
            { status },
          );
        }
      });

    return () => {
      requestSequence.current += 1;
      ownerReservationCount.current = null;
      void supabase.removeChannel(channel);
    };
  }, [refreshCount, supabase]);

  return { reservationSeenCount, reservationTrigger };
}
