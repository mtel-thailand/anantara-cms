"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";

import {
  saveArchivedFinalizedCarStatus,
  saveFinalizedCarDraft,
} from "@/src/features/cars/finalized/finalized-cars.persistence";
import { submissionFromFormValues } from "@/src/features/cars/submission/review/submission-review.helpers";
import {
  deleteSubmissionKeys,
  prepareSubmissionMedia,
  removedSubmissionKeys,
  uploadedSubmissionKeys,
} from "@/src/features/cars/submission/review/submission-review.media";
import {
  parseSubmissionReviewPayload,
  parseSubmissionReviewPayloadEnvelope,
} from "@/src/features/cars/submission/review/submission-review.payload";
import { getCanonicalSubmission } from "@/src/features/cars/submission/review/submission-review.persistence";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";

const publishFinalizedCarDraftSchema = z
  .object({
    draft: z.unknown(),
    targetStatus: z.enum(["finalized", "archived", "rejected"]),
  })
  .strict();

export async function publishFinalizedCarDraftAction(
  submissionId: string,
  payload: unknown,
) {
  const id = z.string().uuid().parse(submissionId);
  const parsed = publishFinalizedCarDraftSchema.parse(payload);
  const envelope = parseSubmissionReviewPayloadEnvelope(parsed.draft);
  const { supabase } = await createAuthenticatedClient();
  const uploadedKeys = uploadedSubmissionKeys(
    envelope.uploads,
    envelope.formId,
    id,
  );
  let draftSaved = false;

  try {
    const current = await getCanonicalSubmission(supabase, id, {
      includeArchived: true,
    });
    if (current.form.id !== envelope.formId) {
      throw new Error("The submission form reference is invalid.");
    }
    if (current.submission.lastUpdated !== envelope.expectedUpdatedAt) {
      throw new Error(
        "This finalized car was changed by another reviewer. Refresh and try again.",
      );
    }

    if (current.submission.status === "archived") {
      await saveArchivedFinalizedCarStatus(supabase, {
        expectedUpdatedAt: envelope.expectedUpdatedAt,
        formId: envelope.formId,
        submissionId: id,
        targetStatus: parsed.targetStatus,
      });
      draftSaved = true;
      return (
        await getCanonicalSubmission(supabase, id, { includeArchived: true })
      ).submission;
    }

    const validationT = await getTranslations("cars.submission.validation");
    const { formId, uploads, values } = parseSubmissionReviewPayload(
      parsed.draft,
      validationT,
    );
    const media = await prepareSubmissionMedia({
      current: current.submission,
      formId,
      submissionId: id,
      uploads,
      values,
    });
    const submission = submissionFromFormValues(
      current.submission,
      { ...values, ...media },
      current.submission.status,
    );

    await saveFinalizedCarDraft(supabase, {
      expectedUpdatedAt: envelope.expectedUpdatedAt,
      formId,
      submission,
      targetStatus: parsed.targetStatus,
    });
    draftSaved = true;

    const saved = await getCanonicalSubmission(supabase, id, {
      includeArchived: true,
    });
    const obsoleteKeys = removedSubmissionKeys(
      current.submission,
      saved.submission,
    );
    if (obsoleteKeys.length) {
      await deleteSubmissionKeys(obsoleteKeys, "removed from finalized car");
    }

    return saved.submission;
  } catch (error) {
    if (!draftSaved && uploadedKeys.length) {
      await deleteSubmissionKeys(uploadedKeys, "finalized car publish failed");
    }
    throw error;
  }
}

export async function archiveFinalizedCarsAction() {
  const { supabase } = await createAuthenticatedClient();
  const { data, error } = await supabase.rpc("archive_finalized_cars");

  if (error) throw error;
  return data;
}
