import type { Json } from "@/src/types/database.types";
import { createClient } from "@/src/lib/supabase/server";
import { recordOwnerReservationStatusEvent } from "@/src/features/cars/reservation/owner-reservation-status-events.persistence";
import { ownerReservationInformationRequests } from "@/src/features/cars/reservation/list/owner-reservation-list.helpers";
import type { OwnerReservationInformationRequest } from "@/src/features/cars/reservation/list/owner-reservation-list.types";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type OwnerReservationRequestEmailContext = {
  accessToken: string;
  action: "owner-registration-create" | "owner-registration-edit";
  recipientEmail: string;
};

export async function saveOwnerReservationInformationRequest(
  supabase: ServerSupabaseClient,
  {
    id,
    adminId,
    request,
    requestedAt,
  }: {
    id: string;
    adminId: string;
    request: OwnerReservationInformationRequest;
    requestedAt: string;
  },
): Promise<OwnerReservationRequestEmailContext> {
  const { data: current, error: currentError } = await supabase
    .from("owner_reservations")
    .select(
      "id, owner_email, received_at, request_note, status, updated_at, car_submissions_form!inner(access_token, email)",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (currentError) throw currentError;
  if (!current) throw new Error("The owner reservation was not found.");

  const newRequestNote: Json = [
    ...ownerReservationInformationRequests(current.request_note),
    request,
  ];
  const { data: saved, error: saveError } = await supabase
    .from("owner_reservations")
    .update({
      request_note: newRequestNote,
      requested_at: requestedAt,
      status: "requested",
      updated_at: requestedAt,
    })
    .eq("id", id)
    .eq("updated_at", current.updated_at)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (saveError) throw saveError;
  if (!saved) {
    throw new Error(
      "The reservation was changed or could not be updated. Refresh and try again.",
    );
  }

  await recordOwnerReservationStatusEvent(supabase, {
    adminId,
    fromStatus: current.status,
    occurredAt: requestedAt,
    recordUnchangedStatus: true,
    reservationId: id,
    toStatus: "requested",
  });

  return {
    accessToken: current.car_submissions_form.access_token ?? "",
    action:
      current.received_at === null
        ? "owner-registration-create"
        : "owner-registration-edit",
    recipientEmail:
      current.owner_email ?? current.car_submissions_form.email ?? "",
  };
}
