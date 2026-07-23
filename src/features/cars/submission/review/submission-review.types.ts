import type { StorageFile } from "@/src/lib/s3/client";

export type SubmissionUploads = {
  documents: StorageFile[];
  images: StorageFile[];
};
