import type {
  CarSubmission,
  SubmissionStatus,
} from "@/src/features/cars/submission/submission.types";
import { logger } from "@/src/lib/logger";
import {
  EmailTemplate,
  sendEmail,
  type SubmissionEmailStatus,
} from "@/src/lib/ses/email";
import type {
  CanonicalSubmission,
  SubmissionFormRow,
} from "./submission-review.persistence";

const EMAIL_STATUSES = new Set<SubmissionEmailStatus>([
  "approved",
  "not_selected",
  "requested_info",
  "under_review",
  "waitlist",
]);

async function sendStatusEmail(
  form: SubmissionFormRow,
  submission: CarSubmission,
  status: SubmissionEmailStatus,
  note: string,
  accessToken: string,
) {
  const imageUrl = submission.images[0]?.url;
  if (!imageUrl) throw new Error("Submission image is missing.");

  await sendEmail(form.email, {
    template: EmailTemplate.SubmissionStatus,
    params: {
      accessToken,
      carId: submission.vehicleRef,
      recipientName: `${form.first_name} ${form.name}`.trim(),
      status,
      note,
      vehicle: {
        reference: form.form_id,
        name: `${submission.vehicle.make} ${submission.vehicle.model}`.trim(),
        year: submission.year,
        bodyStyle: submission.vehicle.bodyStyle,
        imageUrl,
      },
    },
  });
}

export async function sendSubmissionReviewNotification({
  currentStatus,
  finalStatus,
  newInfoMessage,
  nextInfoRequests,
  previousInfoRequests,
  saved,
  submissionId,
}: {
  currentStatus: SubmissionStatus;
  finalStatus: SubmissionStatus;
  newInfoMessage: string;
  nextInfoRequests: CarSubmission["infoRequests"];
  previousInfoRequests: CarSubmission["infoRequests"];
  saved: CanonicalSubmission;
  submissionId: string;
}) {
  const reviewNoteChanged =
    finalStatus === "requested_info" &&
    JSON.stringify(nextInfoRequests) !== JSON.stringify(previousInfoRequests);
  const emailAttempted =
    EMAIL_STATUSES.has(finalStatus as SubmissionEmailStatus) &&
    (finalStatus !== currentStatus || reviewNoteChanged);

  if (!emailAttempted) return { emailAttempted, emailSent: false };

  try {
    await sendStatusEmail(
      saved.form,
      saved.submission,
      finalStatus as SubmissionEmailStatus,
      newInfoMessage.trim() ||
        saved.submission.infoRequests.at(-1)?.message ||
        "",
      saved.form.access_token ?? "",
    );
    return { emailAttempted, emailSent: true };
  } catch (error) {
    logger.error("CAR-SUBMISSIONS", "Status email could not be sent", {
      error: error instanceof Error ? error.message : String(error),
      submissionId,
      status: finalStatus,
    });
    return { emailAttempted, emailSent: false };
  }
}
