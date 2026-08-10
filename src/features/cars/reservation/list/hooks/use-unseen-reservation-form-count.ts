"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { logger } from "@/src/lib/logger";
import { createClient } from "@/src/lib/supabase/client";

const OWNER_RESERVATIONS_TABLE = "owner_reservations";
const CAR_ENTRY_FORMS_TABLE = "car_entry_forms";
const SUBMISSION_VEHICLES_TABLE = "car_submission_vehicles";
const notificationCountsSchema = z.object({
  car_form_seen_count: z.number().int().nonnegative(),
  car_form_total_count: z.number().int().nonnegative(),
  owner_seen_count: z.number().int().nonnegative(),
  owner_total_count: z.number().int().nonnegative(),
});

export function useUnseenReservationFormCount() {
  const supabase = useMemo(() => createClient(), []);
  const [ownerReservationSeenCount, setOwnerReservationSeenCount] = useState(0);
  const [carFormSeenCount, setCarFormSeenCount] = useState(0);
  const requestSequence = useRef(0);
  const ownerReservationCount = useRef<number | null>(null);
  const carFormCount = useRef<number | null>(null);
  const [ownerReservationTrigger, setOwnerReservationTrigger] = useState(0);
  const [carFormTrigger, setCarFormTrigger] = useState(0);

  const refreshCount = useCallback(async () => {
    const request = ++requestSequence.current;
    const { data, error } = await supabase.rpc(
      "get_reservation_form_notification_counts",
    );

    if (error) {
      logger.error(
        "CAR-RESERVATION-FORMS",
        "Failed to count unseen reservation forms",
        { error: error.message },
      );
      return;
    }

    if (request === requestSequence.current) {
      const result = notificationCountsSchema.safeParse(data);
      if (!result.success) {
        logger.error(
          "CAR-RESERVATION-FORMS",
          "Reservation form notification counts returned invalid data",
          { error: result.error.message },
        );
        return;
      }

      const counts = result.data;
      const nextOwnerReservationCount = counts.owner_total_count;
      const nextCarFormCount = counts.car_form_total_count;

      if (
        ownerReservationCount.current !== null &&
        ownerReservationCount.current !== nextOwnerReservationCount
      ) {
        setOwnerReservationTrigger((current) => current + 1);
      }
      if (
        carFormCount.current !== null &&
        carFormCount.current !== nextCarFormCount
      ) {
        setCarFormTrigger((current) => current + 1);
      }

      ownerReservationCount.current = nextOwnerReservationCount;
      carFormCount.current = nextCarFormCount;
      setOwnerReservationSeenCount(counts.owner_seen_count);
      setCarFormSeenCount(counts.car_form_seen_count);
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
        { event: "*", schema: "public", table: CAR_ENTRY_FORMS_TABLE },
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
      carFormCount.current = null;
      void supabase.removeChannel(channel);
    };
  }, [refreshCount, supabase]);

  return {
    carFormSeenCount,
    carFormTrigger,
    ownerReservationSeenCount,
    ownerReservationTrigger,
  };
}
