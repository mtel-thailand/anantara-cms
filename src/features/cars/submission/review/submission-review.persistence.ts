import {
  submissionFormPayload,
  toCarSubmission,
  vehiclePayload,
} from "@/src/features/cars/submission/api/submission.serializer";
import type {
  CarSubmission,
  SubmissionVehicleWithFormRow,
} from "@/src/features/cars/submission/submission.types";
import { createClient } from "@/src/lib/supabase/server";
import { unwrap } from "@/src/lib/supabase/unwrap";

export type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;
export type SubmissionFormRow =
  SubmissionVehicleWithFormRow["car_submissions_form"];
export type CanonicalSubmission = {
  form: SubmissionFormRow;
  submission: CarSubmission;
};

export async function getCanonicalSubmission(
  supabase: ServerSupabaseClient,
  id: string,
): Promise<CanonicalSubmission> {
  const [{ data, error }, { data: car, error: carError }] = await Promise.all([
    supabase
      .from("car_submission_vehicles")
      .select(
        `
        *,
        car_submissions_form!inner (*)
      `,
      )
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("cars")
      .select("category_id")
      .eq("submission_vehicle_id", id)
      .limit(1)
      .maybeSingle(),
  ]);

  const vehicle: SubmissionVehicleWithFormRow | null = unwrap(data, error);
  if (carError) throw carError;
  if (!vehicle) throw new Error("Car submission vehicle was not found.");

  return {
    form: vehicle.car_submissions_form,
    submission: toCarSubmission(vehicle.car_submissions_form, vehicle, car),
  };
}

export async function saveSubmissionReview(
  supabase: ServerSupabaseClient,
  {
    expectedUpdatedAt,
    formId,
    submission,
  }: {
    expectedUpdatedAt: string;
    formId: string;
    submission: CarSubmission;
  },
) {
  const vehicle = vehiclePayload(submission);
  if (vehicle.status === "archived" || vehicle.status === "finalized") {
    throw new Error("Archived or finalized submissions cannot be changed.");
  }

  const { data: savedVehicle, error: vehicleError } = await supabase
    .from("car_submission_vehicles")
    .update(vehicle)
    .eq("id", submission.id)
    .eq("submission_id", formId)
    .eq("updated_at", expectedUpdatedAt)
    .is("archived_at", null)
    .not("status", "in", "(archived,finalized)")
    .select("id")
    .maybeSingle();

  if (vehicleError) throw vehicleError;
  if (!savedVehicle) {
    throw new Error(
      "This submission was changed by another reviewer. Refresh and try again.",
    );
  }

  const { data: savedForm, error: formError } = await supabase
    .from("car_submissions_form")
    .update(submissionFormPayload(submission))
    .eq("id", formId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (formError) throw formError;
  if (!savedForm) throw new Error("The submission form was not found.");
}
