"use server";

import { z } from "zod";

import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import { updateCarEntryFormApproval } from "@/src/features/cars/reservation/review/car-entry-form-review.persistence";
import { sendCarEntryFormCompleteNotification } from "@/src/features/cars/reservation/review/car-entry-form-review.notifications";

const inputSchema = z
  .object({
    action: z.enum(["approve", "undo"]),
    expectedUpdatedAt: z.string().min(1),
    submissionVehicleId: z.string().uuid(),
  })
  .strict();

export async function updateCarEntryFormApprovalAction(input: unknown) {
  const values = inputSchema.parse(input);
  const { supabase, user } = await createAuthenticatedClient();
  const context = await updateCarEntryFormApproval(supabase, {
    ...values,
    reviewerId: user.id,
  });
  const emailSent = context
    ? await sendCarEntryFormCompleteNotification({
        context,
        submissionVehicleId: values.submissionVehicleId,
      })
    : false;

  return { emailAttempted: context !== null, emailSent };
}
