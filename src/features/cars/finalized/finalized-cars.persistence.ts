import "server-only";

import {
  submissionFormPayload,
  vehiclePayload,
} from "@/src/features/cars/submission/api/submission.serializer";
import type { CarSubmission } from "@/src/features/cars/submission/submission.types";
import type { FinalizedCarDraftStatus } from "@/src/features/cars/finalized/finalized-cars.types";
import { createClient } from "@/src/lib/supabase/server";
import type { Json } from "@/src/types/database.types";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function saveArchivedFinalizedCarStatus(
  supabase: ServerSupabaseClient,
  {
    expectedUpdatedAt,
    formId,
    submissionId,
    targetStatus,
  }: {
    expectedUpdatedAt: string;
    formId: string;
    submissionId: string;
    targetStatus: FinalizedCarDraftStatus;
  },
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("car_submission_vehicles")
    .update({
      archived_at: targetStatus === "archived" ? now : null,
      status: targetStatus,
      updated_at: now,
    })
    .eq("id", submissionId)
    .eq("submission_id", formId)
    .eq("status", "archived")
    .eq("updated_at", expectedUpdatedAt)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(
      "This archived car was changed by another reviewer. Refresh and try again.",
    );
  }
}

export async function saveFinalizedCarDraft(
  supabase: ServerSupabaseClient,
  {
    expectedUpdatedAt,
    formId,
    submission,
    targetStatus,
  }: {
    expectedUpdatedAt: string;
    formId: string;
    submission: CarSubmission;
    targetStatus: FinalizedCarDraftStatus;
  },
) {
  const { approved_at, status, ...vehicle } = vehiclePayload(submission);
  void approved_at;
  void status;
  const now = new Date().toISOString();

  const [formLookup, carLookup] = await Promise.all([
    supabase
      .from("car_submissions_form")
      .select("id")
      .eq("id", formId)
      .maybeSingle(),
    supabase
      .from("cars")
      .select("id")
      .eq("submission_vehicle_id", submission.id)
      .maybeSingle(),
  ]);

  if (formLookup.error) throw formLookup.error;
  if (!formLookup.data) {
    throw new Error("The submission form reference is invalid.");
  }
  if (carLookup.error) throw carLookup.error;
  if (!carLookup.data) throw new Error("The finalized car was not found.");

  const { data: savedVehicle, error: vehicleError } = await supabase
    .from("car_submission_vehicles")
    .update({
      ...vehicle,
      archived_at: targetStatus === "archived" ? now : null,
      status: targetStatus,
      updated_at: now,
    })
    .eq("id", submission.id)
    .eq("submission_id", formId)
    .in("status", ["finalized", "archived"])
    .eq("updated_at", expectedUpdatedAt)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (vehicleError) throw vehicleError;
  if (!savedVehicle) {
    throw new Error(
      "This finalized car was changed by another reviewer. Refresh and try again.",
    );
  }

  const { data: savedForm, error: formError } = await supabase
    .from("car_submissions_form")
    .update(submissionFormPayload(submission))
    .eq("id", formId)
    .select("id")
    .maybeSingle();

  if (formError) throw formError;
  if (!savedForm) {
    throw new Error("The submission form could not be updated.");
  }

  const { data: savedCar, error: carError } = await supabase
    .from("cars")
    .update({
      description: submission.history.en,
      description_it: submission.history.it || null,
      images: submission.images.map((image) => image.url) as Json,
      name: [submission.vehicle.make, submission.vehicle.model]
        .filter(Boolean)
        .join(" "),
      owner: [submission.owner.firstName, submission.owner.lastName]
        .filter(Boolean)
        .join(" "),
      short_name: submission.vehicle.model || null,
      year: submission.year,
    })
    .eq("submission_vehicle_id", submission.id)
    .select("id")
    .maybeSingle();

  if (carError) throw carError;
  if (!savedCar) throw new Error("The finalized car could not be updated.");
}
