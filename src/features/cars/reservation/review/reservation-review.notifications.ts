import { logger } from "@/src/lib/logger";
import { EmailTemplate, sendEmail } from "@/src/lib/ses/email";
import type { OwnerRegistrationNotificationContext } from "./reservation-review.persistence";

export async function sendOwnerRegistrationCompleteNotification({
  context,
  reservationId,
}: {
  context: OwnerRegistrationNotificationContext;
  reservationId: string;
}) {
  try {
    if (!context.recipientEmail) throw new Error("Owner email is missing.");
    if (!context.accessToken) throw new Error("Submission access token is missing.");

    await sendEmail(context.recipientEmail, {
      template: EmailTemplate.OwnerRegistrationComplete,
      params: { accessToken: context.accessToken },
    });

    return true;
  } catch (error) {
    logger.error("OWNER-RESERVATIONS", "Approval email could not be sent", {
      error: error instanceof Error ? error.message : String(error),
      reservationId,
    });
    return false;
  }
}
