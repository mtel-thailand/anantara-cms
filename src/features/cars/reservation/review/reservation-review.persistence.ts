import { createClient } from "@/src/lib/supabase/server";
import { recordOwnerReservationStatusEvent } from "@/src/features/cars/reservation/owner-reservation-status-events.persistence";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type OwnerRegistrationNotificationContext = {
  accessToken: string;
  recipientEmail: string;
};

export async function updateOwnerReservationApproval(
  supabase: ServerSupabaseClient,
  {
    action,
    expectedUpdatedAt,
    id,
    reviewerId,
  }: {
    action: "approve" | "undo";
    expectedUpdatedAt: string;
    id: string;
    reviewerId: string;
  },
): Promise<OwnerRegistrationNotificationContext | null> {
  const { data: current, error: currentError } = await supabase
    .from("owner_reservations")
    .select(
      "id, owner_email, status, car_submissions_form!inner(access_token, email)",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (currentError) throw currentError;
  if (!current) throw new Error("The owner registration was not found.");

  const now = new Date().toISOString();
  const fromStatus = action === "approve" ? "received" : "approved";
  const { data: saved, error: saveError } = await supabase
    .from("owner_reservations")
    .update(
      action === "approve"
        ? {
            approved_at: now,
            approved_by: reviewerId,
            status: "approved",
            updated_at: now,
          }
        : {
            approved_at: null,
            approved_by: null,
            status: "received",
            updated_at: now,
          },
    )
    .eq("id", id)
    .eq("status", fromStatus)
    .eq("updated_at", expectedUpdatedAt)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (saveError) throw saveError;
  if (!saved) {
    throw new Error(
      "This registration was changed by another reviewer. Refresh and try again.",
    );
  }

  const toStatus = action === "approve" ? "approved" : "received";
  await recordOwnerReservationStatusEvent(supabase, {
    adminId: reviewerId,
    fromStatus: current.status,
    occurredAt: now,
    reservationId: id,
    toStatus,
  });

  if (action === "undo") return null;

  return {
    accessToken: current.car_submissions_form.access_token ?? "",
    recipientEmail:
      current.owner_email ?? current.car_submissions_form.email ?? "",
  };
}
