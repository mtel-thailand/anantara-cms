"use server";

import { z } from "zod";

import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import {
  restoreCarEntryFormVehicle,
  saveCarEntryFormInformationRequest,
} from "@/src/features/cars/reservation/list/car-entry-form-list.persistence";
import { sendCarEntryFormRequestNotification } from "@/src/features/cars/reservation/list/car-entry-form-list.notifications";
import type { OwnerReservationInformationRequest } from "@/src/features/cars/reservation/list/owner-reservation-list.types";

const requestInformationSchema = z
  .object({
    message: z.string().trim().min(1).max(5000),
    submissionVehicleId: z.string().uuid(),
  })
  .strict();

const vehicleIdSchema = z.string().uuid();

export async function finalizeCarEntryFormVehicleAction(input: unknown) {
  const submissionVehicleId = vehicleIdSchema.parse(input);
  const { supabase } = await createAuthenticatedClient();
  const { data, error } = await supabase.rpc(
    "finalize_car_entry_form_vehicle",
    { p_submission_vehicle_id: submissionVehicleId },
  );

  if (error) throw error;
  if (!data) throw new Error("The car could not be finalized.");
}

export async function restoreCarEntryFormVehicleAction(input: unknown) {
  const submissionVehicleId = vehicleIdSchema.parse(input);
  const { supabase, user } = await createAuthenticatedClient();
  await restoreCarEntryFormVehicle(supabase, {
    adminId: user.id,
    submissionVehicleId,
  });
}

export async function requestCarEntryFormInformationAction(input: unknown) {
  const { message, submissionVehicleId } =
    requestInformationSchema.parse(input);
  const { supabase, user } = await createAuthenticatedClient();
  const requestedAt = new Date().toISOString();
  const request: OwnerReservationInformationRequest = {
    id: `request-${crypto.randomUUID()}`,
    message,
    sentDate: requestedAt.slice(0, 10),
  };

  const context = await saveCarEntryFormInformationRequest(supabase, {
    adminId: user.id,
    request,
    requestedAt,
    submissionVehicleId,
  });
  const emailSent = await sendCarEntryFormRequestNotification({
    context,
    message,
    submissionVehicleId,
  });

  return { emailSent };
}
