"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { logger } from "@/src/lib/logger";
import { createClient } from "@/src/lib/supabase/client";

const OWNER_RESERVATIONS_TABLE = "owner_reservations";
const CAR_ENTRY_FORMS_TABLE = "car_entry_forms";
const SUBMISSION_VEHICLES_TABLE = "car_submission_vehicles";

type RealtimeChangePayload = {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

const notificationCountsSchema = z.object({
  car_form_seen_count: z.number().int().nonnegative(),
  car_form_total_count: z.number().int().nonnegative(),
  owner_seen_count: z.number().int().nonnegative(),
  owner_total_count: z.number().int().nonnegative(),
});
const statusRowsSchema = z.array(
  z.object({
    id: z.string(),
    status: z.string(),
  }),
);

function updateStatusSnapshot(
  payload: RealtimeChangePayload,
  statuses: Map<string, string>,
) {
  if (payload.eventType === "DELETE") {
    const id = payload.old.id;
    if (typeof id === "string") statuses.delete(id);
    return false;
  }

  const id = payload.new.id;
  const status = payload.new.status;
  if (typeof id !== "string" || typeof status !== "string") return false;

  if (payload.new.deleted_at !== null) {
    statuses.delete(id);
    return false;
  }

  const previousStatus =
    statuses.get(id) ??
    (typeof payload.old.status === "string" ? payload.old.status : undefined);
  statuses.set(id, status);

  return (
    payload.eventType === "INSERT" ||
    (payload.eventType === "UPDATE" &&
      previousStatus !== undefined &&
      previousStatus !== status)
  );
}

export function useUnseenReservationFormCount() {
  const supabase = useMemo(() => createClient(), []);
  const [ownerReservationSeenCount, setOwnerReservationSeenCount] = useState(0);
  const [carFormSeenCount, setCarFormSeenCount] = useState(0);
  const requestSequence = useRef(0);
  const statusSnapshotSequence = useRef(0);
  const ownerReservationCount = useRef<number | null>(null);
  const carFormCount = useRef<number | null>(null);
  const ownerReservationStatuses = useRef(new Map<string, string>());
  const carFormStatuses = useRef(new Map<string, string>());
  const pendingOwnerReservationTrigger = useRef(false);
  const pendingCarFormTrigger = useRef(false);
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
      const hasOwnerReservationCountChanged =
        ownerReservationCount.current !== null &&
        ownerReservationCount.current !== nextOwnerReservationCount;
      const hasCarFormCountChanged =
        carFormCount.current !== null &&
        carFormCount.current !== nextCarFormCount;

      if (
        hasOwnerReservationCountChanged ||
        (ownerReservationCount.current !== null &&
          pendingOwnerReservationTrigger.current)
      ) {
        setOwnerReservationTrigger((current) => current + 1);
      }
      if (
        hasCarFormCountChanged ||
        (carFormCount.current !== null && pendingCarFormTrigger.current)
      ) {
        setCarFormTrigger((current) => current + 1);
      }

      pendingOwnerReservationTrigger.current = false;
      pendingCarFormTrigger.current = false;
      ownerReservationCount.current = nextOwnerReservationCount;
      carFormCount.current = nextCarFormCount;
      setOwnerReservationSeenCount(counts.owner_seen_count);
      setCarFormSeenCount(counts.car_form_seen_count);
    }
  }, [supabase]);

  const initializeStatusSnapshots = useCallback(async () => {
    const request = ++statusSnapshotSequence.current;
    const [ownerResult, carFormResult] = await Promise.all([
      supabase
        .from(OWNER_RESERVATIONS_TABLE)
        .select("id, status")
        .is("deleted_at", null),
      supabase
        .from(CAR_ENTRY_FORMS_TABLE)
        .select("id, status")
        .is("deleted_at", null),
    ]);

    if (ownerResult.error || carFormResult.error) {
      logger.error(
        "CAR-RESERVATION-FORMS",
        "Failed to initialize reservation form status snapshots",
        {
          carFormError: carFormResult.error?.message,
          ownerReservationError: ownerResult.error?.message,
        },
      );
      return;
    }

    if (request !== statusSnapshotSequence.current) return;

    const ownerRows = statusRowsSchema.safeParse(ownerResult.data);
    const carFormRows = statusRowsSchema.safeParse(carFormResult.data);
    if (!ownerRows.success || !carFormRows.success) {
      logger.error(
        "CAR-RESERVATION-FORMS",
        "Reservation form status snapshots returned invalid data",
        {
          carFormError: carFormRows.error?.message,
          ownerReservationError: ownerRows.error?.message,
        },
      );
      return;
    }

    ownerReservationStatuses.current = new Map(
      ownerRows.data.map(({ id, status }) => [id, status]),
    );
    carFormStatuses.current = new Map(
      carFormRows.data.map(({ id, status }) => [id, status]),
    );
  }, [supabase]);

  useEffect(() => {
    void refreshCount();
    void initializeStatusSnapshots();

    const channel = supabase
      .channel("sidebar-unseen-car-reservation-forms")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: OWNER_RESERVATIONS_TABLE,
        },
        (payload) => {
          if (updateStatusSnapshot(payload, ownerReservationStatuses.current)) {
            pendingOwnerReservationTrigger.current = true;
          }
          void refreshCount();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: CAR_ENTRY_FORMS_TABLE },
        (payload) => {
          if (updateStatusSnapshot(payload, carFormStatuses.current)) {
            pendingCarFormTrigger.current = true;
          }
          void refreshCount();
        },
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
      statusSnapshotSequence.current += 1;
      ownerReservationCount.current = null;
      carFormCount.current = null;
      ownerReservationStatuses.current.clear();
      carFormStatuses.current.clear();
      pendingOwnerReservationTrigger.current = false;
      pendingCarFormTrigger.current = false;
      void supabase.removeChannel(channel);
    };
  }, [initializeStatusSnapshots, refreshCount, supabase]);

  return {
    carFormSeenCount,
    carFormTrigger,
    ownerReservationSeenCount,
    ownerReservationTrigger,
  };
}
