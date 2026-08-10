import type { StorageFile } from "@/src/lib/s3/client";
import type { SubmissionReviewFormValues } from "@/src/features/cars/submission/review/submission-review.schema";

export type SubmissionUploads = {
  documents: StorageFile[];
  images: StorageFile[];
};

export type SubmissionReviewDraft = {
  expectedUpdatedAt: string;
  formId: string;
  imageFiles: Array<[id: string, file: File]>;
  submissionId: string;
  stagedStatus: string;
  values: SubmissionReviewFormValues;
};
