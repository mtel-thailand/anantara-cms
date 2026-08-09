import type { createClient } from "@/src/lib/supabase/server";
import {
  carEntryFormEmailVehicle,
  type CarEntryFormEmailContext,
} from "@/src/features/cars/reservation/car-entry-form-email.helpers";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function updateCarEntryFormApproval(
  supabase: ServerSupabaseClient,
  {
    action,
    expectedUpdatedAt,
    reviewerId,
    submissionVehicleId,
  }: {
    action: "approve" | "undo";
    expectedUpdatedAt: string;
    reviewerId: string;
    submissionVehicleId: string;
  },
): Promise<CarEntryFormEmailContext | null> {
  const fromStatus = action === "approve" ? "received" : "approved";
  const toStatus = action === "approve" ? "approved" : "received";
  const now = new Date().toISOString();
  const { data: current, error: currentError } = await supabase
    .from("car_entry_forms")
    .select(
      `id, status,
       car_submission_vehicles!inner(
         body_style, images, make_of_vehicle, model, vehicle_ref,
         year_of_manufacture,
         car_submissions_form!inner(access_token, email)
       )`,
    )
    .eq("submission_vehicle_id", submissionVehicleId)
    .eq("status", fromStatus)
    .eq("updated_at", expectedUpdatedAt)
    .is("deleted_at", null)
    .maybeSingle();

  if (currentError) throw currentError;
  if (!current) {
    throw new Error(
      "This car entry form was changed by another reviewer. Refresh and try again.",
    );
  }

  const { data: saved, error: saveError } = await supabase
    .from("car_entry_forms")
    .update(
      action === "approve"
        ? {
            approved_at: now,
            approved_by: reviewerId,
            status: toStatus,
            updated_at: now,
          }
        : {
            approved_at: null,
            approved_by: null,
            status: toStatus,
            updated_at: now,
          },
    )
    .eq("id", current.id)
    .eq("status", fromStatus)
    .eq("updated_at", expectedUpdatedAt)
    .select("id")
    .maybeSingle();
  if (saveError) throw saveError;
  if (!saved) throw new Error("The car entry form could not be updated.");

  const { error: eventError } = await supabase
    .from("car_entry_form_status_events")
    .insert({
      admin_id: reviewerId,
      car_entry_form_id: current.id,
      from_status: current.status,
      metadata: { action },
      occurred_at: now,
      to_status: toStatus,
    });
  if (eventError) throw eventError;

  if (action === "undo") return null;

  const vehicle = current.car_submission_vehicles;
  return {
    accessToken: vehicle.car_submissions_form.access_token ?? "",
    recipientEmail: vehicle.car_submissions_form.email,
    vehicle: carEntryFormEmailVehicle(vehicle),
  };
}
