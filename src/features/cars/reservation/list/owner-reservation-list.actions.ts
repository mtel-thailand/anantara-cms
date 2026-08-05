"use server";

import { z } from "zod";

import { logger } from "@/src/lib/logger";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import { unwrap } from "@/src/lib/supabase/unwrap";
import { recordOwnerReservationStatusEvent } from "@/src/features/cars/reservation/owner-reservation-status-events.persistence";
import { sendOwnerReservationRequestNotification } from "@/src/features/cars/reservation/list/owner-reservation-list.notifications";
import { saveOwnerReservationInformationRequest } from "@/src/features/cars/reservation/list/owner-reservation-list.persistence";
import type { OwnerReservationInformationRequest } from "@/src/features/cars/reservation/list/owner-reservation-list.types";

const requestInformationSchema = z
  .object({
    id: z.string().uuid(),
    message: z.string().trim().min(1).max(5000),
  })
  .strict();

const reservationIdSchema = z.string().uuid();
const clearOwnerReservationFormsResultSchema = z
  .object({
    approved_vehicle_count: z.number().int().nonnegative(),
    owner_reservation_count: z.number().int().nonnegative(),
  })
  .strict();

export async function clearOwnerReservationFormsAction() {
  const { supabase } = await createAuthenticatedClient();
  const { data, error } = await supabase.rpc("clear_owner_reservation_forms");

  return clearOwnerReservationFormsResultSchema.parse(unwrap(data, error));
}

export async function restoreOwnerReservationAction(input: unknown) {
  const id = reservationIdSchema.parse(input);
  const { supabase, user } = await createAuthenticatedClient();

  const restoredAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("owner_reservations")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id, status")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    logger.error(
      "OWNER-RESERVATIONS",
      "Deleted owner reservation was not found during restore",
      { reservationId: id },
    );
    throw new Error("The deleted owner reservation was not found.");
  }

  await recordOwnerReservationStatusEvent(supabase, {
    adminId: user.id,
    eventAction: "restore",
    fromStatus: data.status,
    occurredAt: restoredAt,
    recordUnchangedStatus: true,
    reservationId: data.id,
    toStatus: data.status,
  });
}

export async function requestOwnerReservationInformationAction(input: unknown) {
  const { id, message } = requestInformationSchema.parse(input);
  const { supabase, user } = await createAuthenticatedClient();

  const requestedAt = new Date().toISOString();
  const request: OwnerReservationInformationRequest = {
    id: `request-${crypto.randomUUID()}`,
    message,
    sentDate: requestedAt.slice(0, 10),
  };

  const context = await saveOwnerReservationInformationRequest(supabase, {
    adminId: user.id,
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
