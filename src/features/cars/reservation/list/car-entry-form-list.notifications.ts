import { logger } from "@/src/lib/logger";
import { EmailTemplate, sendEmail } from "@/src/lib/ses/email";
import type { CarEntryFormRequestEmailContext } from "@/src/features/cars/reservation/car-entry-form-email.helpers";

export async function sendCarEntryFormRequestNotification({
  context,
  message,
  submissionVehicleId,
}: {
  context: CarEntryFormRequestEmailContext;
  message: string;
  submissionVehicleId: string;
}) {
  try {
    if (!context.recipientEmail) throw new Error("Owner email is missing.");
    if (!context.accessToken) throw new Error("Submission access token is missing.");

    await sendEmail(context.recipientEmail, {
      template: EmailTemplate.CarEntryFormRequired,
      params: {
        accessToken: context.accessToken,
        action: context.action,
        message,
        submissionVehicleId,
        vehicle: context.vehicle,
      },
    });
    return true;
  } catch (error) {
    logger.error("CAR-ENTRY-FORMS", "Request email could not be sent", {
      error: error instanceof Error ? error.message : String(error),
      submissionVehicleId,
    });
    return false;
  }
}
