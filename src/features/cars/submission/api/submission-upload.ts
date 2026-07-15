import type { StorageScope } from "@/src/lib/s3/scope";

export type SubmissionUploadKind = "documents" | "images";

export function submissionUploadRootScope(
  formId: string,
  submissionId: string,
): StorageScope {
  return ["car-submissions", formId, "vehicles", submissionId];
}

export function submissionUploadScope(
  formId: string,
  submissionId: string,
  kind: SubmissionUploadKind,
): StorageScope {
  return [...submissionUploadRootScope(formId, submissionId), kind];
}
