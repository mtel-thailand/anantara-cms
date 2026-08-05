"use server";

import { z } from "zod";

import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import { sendOwnerRegistrationCompleteNotification } from "@/src/features/cars/reservation/review/reservation-review.notifications";
import { updateOwnerReservationApproval } from "@/src/features/cars/reservation/review/reservation-review.persistence";

const inputSchema = z.object({
  id: z.string().uuid(),
  expectedUpdatedAt: z.string().min(1),
  action: z.enum(["approve", "undo"]),
});

export async function updateOwnerReservationApprovalAction(input: unknown) {
  const { action, expectedUpdatedAt, id } = inputSchema.parse(input);
  const { supabase, user } = await createAuthenticatedClient();

  const notificationContext = await updateOwnerReservationApproval(supabase, {
    action,
    expectedUpdatedAt,
    id,
    reviewerId: user.id,
  });
  const emailSent = notificationContext
    ? await sendOwnerRegistrationCompleteNotification({
        context: notificationContext,
        reservationId: id,
      })
    : false;

  return { emailAttempted: notificationContext !== null, emailSent };
}
