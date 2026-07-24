"use server";

import { z } from "zod";
import { getTranslations } from "next-intl/server";

import type {
  CarSubmission,
  SubmissionStatus,
} from "@/src/features/cars/submission/submission.types";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import { submissionFromFormValues } from "./submission-review.helpers";
import {
  deleteSubmissionKeys,
  prepareSubmissionMedia,
  removedSubmissionKeys,
  uploadedSubmissionKeys,
} from "./submission-review.media";
import { sendSubmissionReviewNotification } from "./submission-review.notifications";
import {
  parseSubmissionReviewPayload,
  resolveSubmissionReviewStatus,
} from "./submission-review.payload";
import {
  getCanonicalSubmission,
  saveSubmissionReview,
} from "./submission-review.persistence";

export async function saveCarSubmissionAction(
  submissionId: string,
  payload: unknown,
): Promise<{
  emailAttempted: boolean;
  emailSent: boolean;
  finalStatus: SubmissionStatus;
  submission: CarSubmission;
}> {
  const id = z.string().trim().min(1).parse(submissionId);
  const validationT = await getTranslations("cars.submission.validation");
  const { expectedUpdatedAt, formId, uploads, values } =
    parseSubmissionReviewPayload(payload, validationT);
  const supabase = await createAuthenticatedClient();

  const uploadedKeys = uploadedSubmissionKeys(uploads, formId, id);
  let submissionSaved = false;

  try {
    const current = await getCanonicalSubmission(supabase, id);
    if (current.form.id !== formId) {
      throw new Error("The submission form reference is invalid.");
    }
    if (current.submission.lastUpdated !== expectedUpdatedAt) {
      throw new Error(
        "This submission was changed by another reviewer. Refresh and try again.",
      );
    }

    const media = await prepareSubmissionMedia({
      current: current.submission,
      formId,
      submissionId: id,
      uploads,
      values,
    });
    const finalStatus = resolveSubmissionReviewStatus(
      current.submission.status,
      values,
    );
    const submission = submissionFromFormValues(
      current.submission,
      {
        ...values,
        ...media,
        infoRequests: current.submission.infoRequests,
      },
      finalStatus,
    );

    await saveSubmissionReview(supabase, {
      expectedUpdatedAt,
      formId: current.form.id,
      submission,
    });
    submissionSaved = true;

    const saved = await getCanonicalSubmission(supabase, id);
    const obsoleteKeys = removedSubmissionKeys(
      current.submission,
      saved.submission,
    );
    if (obsoleteKeys.length) {
      await deleteSubmissionKeys(obsoleteKeys, "removed from submission");
    }

    const notification = await sendSubmissionReviewNotification({
      currentStatus: current.submission.status,
      finalStatus,
      newInfoMessage: values.newInfoMessage,
      nextInfoRequests: submission.infoRequests,
      previousInfoRequests: current.submission.infoRequests,
      saved,
      submissionId: id,
    });

    return {
      ...notification,
      finalStatus,
      submission: saved.submission,
    };
  } catch (error) {
    if (!submissionSaved && uploadedKeys.length) {
      await deleteSubmissionKeys(uploadedKeys, "save failed");
    }
    throw error;
  }
}
