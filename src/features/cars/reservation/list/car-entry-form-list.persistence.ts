import type { Json } from "@/src/types/database.types";
import type { createClient } from "@/src/lib/supabase/server";
import { ownerReservationInformationRequests } from "@/src/features/cars/reservation/list/owner-reservation-list.helpers";
import type { OwnerReservationInformationRequest } from "@/src/features/cars/reservation/list/owner-reservation-list.types";
import {
  carEntryFormEmailVehicle,
  type CarEntryFormRequestEmailContext,
} from "@/src/features/cars/reservation/car-entry-form-email.helpers";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function restoreCarEntryFormVehicle(
  supabase: ServerSupabaseClient,
  {
    adminId,
    submissionVehicleId,
  }: { adminId: string; submissionVehicleId: string },
) {
  const now = new Date().toISOString();
  const { data: vehicle, error: vehicleError } = await supabase
    .from("car_submission_vehicles")
    .update({ deleted_at: null, updated_at: now })
    .eq("id", submissionVehicleId)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();
  if (vehicleError) throw vehicleError;
  if (!vehicle) throw new Error("The deleted car form was not found.");

  const { data: form, error: formError } = await supabase
    .from("car_entry_forms")
    .update({ deleted_at: null, updated_at: now })
    .eq("submission_vehicle_id", submissionVehicleId)
    .select("id, status")
    .maybeSingle();
  if (formError) throw formError;
  if (!form) return;

  const { error: eventError } = await supabase
    .from("car_entry_form_status_events")
    .insert({
      admin_id: adminId,
      car_entry_form_id: form.id,
      from_status: form.status,
      metadata: { action: "restore" },
      occurred_at: now,
      to_status: form.status,
    });
  if (eventError) throw eventError;
}

export async function saveCarEntryFormInformationRequest(
  supabase: ServerSupabaseClient,
  {
    adminId,
    request,
    requestedAt,
    submissionVehicleId,
  }: {
    adminId: string;
    request: OwnerReservationInformationRequest;
    requestedAt: string;
    submissionVehicleId: string;
  },
): Promise<CarEntryFormRequestEmailContext> {
  const { data: vehicle, error: vehicleError } = await supabase
    .from("car_submission_vehicles")
    .select(
      "id, body_style, images, make_of_vehicle, model, vehicle_ref, year_of_manufacture, car_submissions_form!inner(access_token, email)",
    )
    .eq("id", submissionVehicleId)
    .eq("status", "approved")
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle();

  if (vehicleError) throw vehicleError;
  if (!vehicle)
    throw new Error("The approved submission vehicle was not found.");

  const { error: createError } = await supabase.from("car_entry_forms").upsert(
    {
      status: "required",
      submission_vehicle_id: submissionVehicleId,
    },
    {
      ignoreDuplicates: true,
      onConflict: "submission_vehicle_id",
    },
  );
  if (createError) throw createError;

  const { data: current, error: currentError } = await supabase
    .from("car_entry_forms")
    .select("id, received_at, request_note, status, updated_at")
    .eq("submission_vehicle_id", submissionVehicleId)
    .in("status", ["required", "received"])
    .is("deleted_at", null)
    .maybeSingle();

  if (currentError) throw currentError;
  if (!current) {
    throw new Error(
      "Only required or received car entry forms can request information.",
    );
  }

  const action =
    current.received_at === null ? "car-entry-create" : "car-entry-edit";

  const requestNote: Json = [
    ...ownerReservationInformationRequests(current.request_note),
    request,
  ];
  const { data: saved, error: saveError } = await supabase
    .from("car_entry_forms")
    .update({
      request_note: requestNote,
      requested_at: requestedAt,
      status: "requested",
      updated_at: requestedAt,
    })
    .eq("id", current.id)
    .eq("status", current.status)
    .eq("updated_at", current.updated_at)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (saveError) throw saveError;
  if (!saved) {
    throw new Error(
      "The car entry form changed or could not be updated. Refresh and try again.",
    );
  }

  const { error: eventError } = await supabase
    .from("car_entry_form_status_events")
    .insert({
      admin_id: adminId,
      car_entry_form_id: current.id,
      from_status: current.status,
      metadata: {
        mode: action === "car-entry-create" ? "create" : "edit",
        source: "car-entry-form",
      },
      occurred_at: requestedAt,
      to_status: "requested",
    })
    .select("id")
    .single();

  if (eventError) throw eventError;

  return {
    accessToken: vehicle.car_submissions_form.access_token ?? "",
    action,
    recipientEmail: vehicle.car_submissions_form.email,
    vehicle: carEntryFormEmailVehicle(vehicle),
  };
}
