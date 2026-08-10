import { logger } from "@/src/lib/logger";
import { EmailTemplate, sendEmail } from "@/src/lib/ses/email";
import type { OwnerReservationRequestEmailContext } from "@/src/features/cars/reservation/list/owner-reservation-list.persistence";

export async function sendOwnerReservationRequestNotification({
  context,
  message,
  reservationId,
}: {
  context: OwnerReservationRequestEmailContext;
  message: string;
  reservationId: string;
}) {
  try {
    if (!context.recipientEmail) throw new Error("Owner email is missing.");
    if (!context.accessToken) throw new Error("Submission access token is missing.");
    await sendEmail(context.recipientEmail, {
      template: EmailTemplate.OwnerRegistrationRequired,
      params: {
        accessToken: context.accessToken,
        action: context.action,
        message,
      },
    });

    return true;
  } catch (error) {
    logger.error("OWNER-RESERVATIONS", "Request email could not be sent", {
      error: error instanceof Error ? error.message : String(error),
      reservationId,
    });
    return false;
  }
}
