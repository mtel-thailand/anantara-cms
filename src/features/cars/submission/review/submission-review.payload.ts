import { z } from "zod";

import type { SubmissionStatus } from "@/src/features/cars/submission/submission.types";
import { StorageFileSchema } from "@/src/schema/storage-file.schema";
import {
  getSubmissionReviewSchema,
  type SubmissionReviewFormValues,
} from "./submission-review.schema";

const MAX_FILES_PER_KIND = 10;
const savePayloadSchema = z
  .object({
    expectedUpdatedAt: z.string().min(1),
    formId: z.string().min(1),
    values: z.unknown(),
    uploads: z
      .object({
        images: z.array(StorageFileSchema).max(MAX_FILES_PER_KIND),
        documents: z.array(StorageFileSchema).max(MAX_FILES_PER_KIND),
      })
      .strict(),
  })
  .strict();

export function parseSubmissionReviewPayload(
  payload: unknown,
  t: import("@/src/types/translation").Translator,
) {
  const parsed = savePayloadSchema.parse(payload);
  const values = getSubmissionReviewSchema(t).parse(parsed.values);

  if (values.status === "archived") {
    throw new Error("Archived submissions cannot be changed from this action.");
  }

  return {
    expectedUpdatedAt: parsed.expectedUpdatedAt,
    formId: parsed.formId,
    uploads: parsed.uploads,
    values,
  };
}

export function resolveSubmissionReviewStatus(
  currentStatus: SubmissionStatus,
  values: SubmissionReviewFormValues,
): SubmissionStatus {
  if (
    values.status === "requested_info" &&
    currentStatus === "info_received" &&
    !values.newInfoMessage.trim()
  ) {
    return "info_received";
  }

  return values.status;
}
