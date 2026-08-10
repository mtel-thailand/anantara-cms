import { createClient } from "@/src/lib/supabase/client";
import type {
  CarEntryFormReviewDetail,
  CarFormsReviewShell,
} from "@/src/features/cars/reservation/review/car-entry-form-review.types";
import { unwrap } from "@/src/lib/supabase/unwrap";

export async function getCarEntryFormReview(
  submissionVehicleId: string,
): Promise<CarEntryFormReviewDetail> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("car_entry_forms")
    .select(
      `*,
       car_entry_form_technicians(*),
       car_submission_vehicles!inner(
         body_style, chassis_no, coachbuilder, engine_no, exterior_colour,
         interior_colour, make_of_vehicle, model, vehicle_history_en,
         year_of_manufacture
       )`,
    )
    .eq("submission_vehicle_id", submissionVehicleId)
    .maybeSingle();

  const formData = unwrap(data, error);

  return {
    form: formData,
    technicians: formData.car_entry_form_technicians,
    vehicle: formData.car_submission_vehicles,
  };
}

export async function getCarFormsReviewShell(
  submissionVehicleId: string,
): Promise<CarFormsReviewShell> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("car_entry_forms")
    .select(
      `status, updated_at,
       car_submission_vehicles!inner(
         vehicle_ref, make_of_vehicle, model, created_at, deleted_at, updated_at,
         car_submissions_form!inner(owner_reservations(id))
       )`,
    )
    .eq("submission_vehicle_id", submissionVehicleId)
    .maybeSingle();

  const vehicleData = unwrap(data, error);
  if (error) throw error;
  if (!data) throw new Error("The car entry form was not found.");

  const vehicle = vehicleData.car_submission_vehicles;
  return {
    form: { status: vehicleData.status, updated_at: vehicleData.updated_at },
    ownerReservationId:
      vehicle.car_submissions_form.owner_reservations?.id ?? null,
    vehicle: {
      createdAt: vehicle.created_at,
      deletedAt: vehicle.deleted_at,
      make: vehicle.make_of_vehicle,
      model: vehicle.model,
      updatedAt: vehicle.updated_at,
      vehicleRef: vehicle.vehicle_ref,
    },
  };
}

export async function markCarEntryFormSeen(submissionVehicleId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("car_entry_forms")
    .update({ seen: true })
    .eq("submission_vehicle_id", submissionVehicleId)
    .eq("seen", false);
  if (error) throw error;
}
