"use server";

import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import { unwrap } from "@/src/lib/supabase/unwrap";
import { z } from "zod";

const vehicleIdSchema = z.string().uuid();
const clearableStatusesSchema = z
  .array(
    z.enum([
      "pending",
      "under_review",
      "requested_info",
      "info_received",
      "waitlist",
      "rejected",
    ]),
  )
  .min(1);

export async function restoreSubmissionVehicle(input: unknown) {
  const vehicleId = vehicleIdSchema.parse(input);
  const { supabase } = await createAuthenticatedClient();

  const { data, error } = await supabase
    .from("car_submission_vehicles")
    .update({ deleted_at: null })
    .eq("id", vehicleId)
    .not("deleted_at", "is", null)
    .not("status", "in", "(archived,finalized,approved)")
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("The deleted car submission was not found.");
}

export async function clearSubmissionVehicle(statuses: unknown) {
  const { supabase } = await createAuthenticatedClient();
  const parsedStatuses = clearableStatusesSchema.parse(statuses);
  const { data, error } = await supabase.rpc(
    "mark_car_submission_vehicles_deleted_by_statuses",
    {
      p_statuses: parsedStatuses,
    },
  );

  return unwrap(data, error);
}
