import type { createClient } from "@/src/lib/supabase/server";
import type { OwnerReservationStatus } from "./list/owner-reservation-list.types";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function recordOwnerReservationStatusEvent(
  supabase: ServerSupabaseClient,
  {
    adminId,
    eventAction,
    fromStatus,
    occurredAt,
    recordUnchangedStatus = false,
    reservationId,
    toStatus,
  }: {
    adminId: string;
    eventAction?: "restore";
    fromStatus: OwnerReservationStatus;
    occurredAt: string;
    recordUnchangedStatus?: boolean;
    reservationId: string;
    toStatus: OwnerReservationStatus;
  },
) {
  if (fromStatus === toStatus && !recordUnchangedStatus) return;

  const { error } = await supabase
    .from("reservation_status_events")
    .insert({
      admin_id: adminId,
      from_status: fromStatus,
      metadata:
        eventAction === "restore"
          ? {
              action: "restore",
              mode: "update",
              source: "owner-registration",
            }
          : {
              mode: "create",
              source: "owner-registration",
            },
      occurred_at: occurredAt,
      reservation_id: reservationId,
      to_status: toStatus,
    })
    .select("id")
    .single();

  if (error) throw error;
}
