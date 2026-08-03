"use server";

import { z } from "zod";

import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import { sendOwnerRegistrationCompleteNotification } from "./reservation-review.notifications";
import { updateOwnerReservationApproval } from "./reservation-review.persistence";

const inputSchema = z.object({
  id: z.string().uuid(),
  expectedUpdatedAt: z.string().min(1),
  action: z.enum(["approve", "undo"]),
});

export async function updateOwnerReservationApprovalAction(input: unknown) {
  const { action, expectedUpdatedAt, id } = inputSchema.parse(input);
  const supabase = await createAuthenticatedClient();
  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError || !authData.user) throw new Error("Unauthorized");

  const notificationContext = await updateOwnerReservationApproval(supabase, {
    action,
    expectedUpdatedAt,
    id,
    reviewerId: authData.user.id,
  });
  const emailSent = notificationContext
    ? await sendOwnerRegistrationCompleteNotification({
        context: notificationContext,
        reservationId: id,
      })
    : false;

  return { emailAttempted: notificationContext !== null, emailSent };
}
