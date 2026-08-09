import type { CarEntryFormEmailContext } from "@/src/features/cars/reservation/car-entry-form-email.helpers";
import { logger } from "@/src/lib/logger";
import { EmailTemplate, sendEmail } from "@/src/lib/ses/email";

export async function sendCarEntryFormCompleteNotification({
  context,
  submissionVehicleId,
}: {
  context: CarEntryFormEmailContext;
  submissionVehicleId: string;
}) {
  try {
    if (!context.recipientEmail) throw new Error("Owner email is missing.");
    if (!context.accessToken) throw new Error("Submission access token is missing.");

    await sendEmail(context.recipientEmail, {
      template: EmailTemplate.CarEntryFormComplete,
      params: {
        accessToken: context.accessToken,
        vehicle: context.vehicle,
      },
    });
    return true;
  } catch (error) {
    logger.error("CAR-ENTRY-FORMS", "Completion email could not be sent", {
      error: error instanceof Error ? error.message : String(error),
      submissionVehicleId,
    });
    return false;
  }
}
