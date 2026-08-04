"use server";

import { z } from "zod";

import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import { sendOwnerReservationRequestNotification } from "./owner-reservation-list.notifications";
import { saveOwnerReservationInformationRequest } from "./owner-reservation-list.persistence";
import type { OwnerReservationInformationRequest } from "./owner-reservation-list.types";

const requestInformationSchema = z
  .object({
    id: z.string().uuid(),
    message: z.string().trim().min(1).max(5000),
  })
  .strict();

export async function requestOwnerReservationInformationAction(input: unknown) {
  const { id, message } = requestInformationSchema.parse(input);
  const supabase = await createAuthenticatedClient();
  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError || !authData.user) throw new Error("Unauthorized");
  
  const requestedAt = new Date().toISOString();
  const request: OwnerReservationInformationRequest = {
    id: `request-${crypto.randomUUID()}`,
    message,
    sentDate: requestedAt.slice(0, 10),
  };

  const context = await saveOwnerReservationInformationRequest(supabase, {
    adminId: authData.user.id,
    id,
    request,
    requestedAt,
  });
  const emailSent = await sendOwnerReservationRequestNotification({
    context,
    message,
    reservationId: id,
  });

  return { emailSent };
}
