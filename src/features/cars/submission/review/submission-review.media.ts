import type {
  CarSubmission,
  SubmissionDocument,
  SubmissionImage,
} from "@/src/features/cars/submission/submission.types";
import {
  buildStoragePublicUrl,
  storageAdaptorDeleteFile,
  storageAdaptorGetFileMetadata,
  type StorageFile,
} from "@/src/lib/s3/client";
import { buildStoragePrefix } from "@/src/lib/s3/key";
import { storageScopesEqual } from "@/src/lib/s3/scope";
import { logger } from "@/src/lib/logger";
import { normalizedFileName } from "@/src/lib/string";
import {
  submissionUploadRootScope,
  submissionUploadScope,
  type SubmissionUploadKind,
} from "../api/submission-upload";
import type { SubmissionReviewFormValues } from "./submission-review.schema";
import type { SubmissionUploads } from "./submission-review.types";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const DOCUMENT_TYPES = new Set([
  "application/msword",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_UPLOAD_BYTES = 100 * 1024 * 1024;

async function validateStoredFiles<TFile extends StorageFile>(
  files: TFile[],
  formId: string,
  kind: SubmissionUploadKind,
  submissionId: string,
) {
  const expectedScope = submissionUploadScope(formId, submissionId, kind);
  const prefix = `${buildStoragePrefix(expectedScope)}/`;

  return Promise.all(
    files.map(async (file, index) => {
      if (!file.url.startsWith(prefix) || file.url.includes("..")) {
        throw new Error("An uploaded file has an invalid storage path.");
      }

      const storedFile = await storageAdaptorGetFileMetadata(file.url);
      if (!storageScopesEqual(storedFile.scope, expectedScope)) {
        throw new Error("An uploaded file has an invalid storage scope.");
      }

      if (storedFile.size > MAX_FILE_BYTES) {
        throw new Error("An uploaded file is larger than 10MB.");
      }

      if (kind === "images" && !IMAGE_TYPES.has(storedFile.contentType)) {
        throw new Error("Uploaded images must be JPG or PNG files.");
      }

      if (
        kind === "documents" &&
        !DOCUMENT_TYPES.has(storedFile.contentType) &&
        !/\.(pdf|docx?)$/i.test(storedFile.fileName)
      ) {
        throw new Error("Uploaded documents must be PDF, DOC, or DOCX files.");
      }

      return {
        ...file,
        contentType: storedFile.contentType,
        fileName: storedFile.fileName,
        publicUrl: buildStoragePublicUrl(file.url),
        seq: index + 1,
        size: storedFile.size,
      };
    }),
  );
}

function assertPendingFilesMatch({
  existingNames,
  kind,
  pendingNames,
  uploadedFiles,
}: {
  existingNames: string[];
  kind: "documents" | "images";
  pendingNames: string[];
  uploadedFiles: StorageFile[];
}) {
  if (pendingNames.length !== uploadedFiles.length) {
    throw new Error("Attached files do not match the submission draft.");
  }

  const names = new Set(existingNames.map(normalizedFileName));
  pendingNames.forEach((pendingName, index) => {
    const uploadedName = uploadedFiles[index]?.fileName;
    if (
      !pendingName ||
      !uploadedName ||
      normalizedFileName(uploadedName) !== normalizedFileName(pendingName)
    ) {
      throw new Error(`Attached ${kind} do not match the submission draft.`);
    }

    const normalizedName = normalizedFileName(pendingName);
    if (names.has(normalizedName)) {
      throw new Error(`A file named "${pendingName}" has already been added.`);
    }
    names.add(normalizedName);
  });
}

function reconcileExistingMedia<T extends { id: string }>(
  requested: T[],
  current: T[],
  temporaryPrefix: string,
) {
  const currentById = new Map(current.map((item) => [item.id, item]));
  const seen = new Set<string>();

  return requested.map((item) => {
    if (seen.has(item.id)) throw new Error("Duplicate attachment detected.");
    seen.add(item.id);

    if (item.id.startsWith(temporaryPrefix)) return null;

    const canonical = currentById.get(item.id);
    if (!canonical) throw new Error("An attachment no longer exists.");
    return canonical;
  });
}

function imageFromUpload(file: StorageFile): SubmissionImage {
  return {
    id: file.url,
    url: file.publicUrl,
    key: file.url,
    fileName: file.fileName,
    contentType: file.contentType,
    size: file.size,
    seq: file.seq,
  };
}

function documentFromUpload(file: StorageFile): SubmissionDocument {
  return {
    id: file.url,
    name: file.fileName,
    url: file.publicUrl,
    key: file.url,
    fileName: file.fileName,
    contentType: file.contentType,
    size: file.size,
    seq: file.seq,
  };
}

export async function prepareSubmissionMedia({
  current,
  formId,
  submissionId,
  uploads,
  values,
}: {
  current: CarSubmission;
  formId: string;
  submissionId: string;
  uploads: SubmissionUploads;
  values: SubmissionReviewFormValues;
}) {
  const uploadedImages = await validateStoredFiles(
    uploads.images,
    formId,
    "images",
    submissionId,
  );
  const uploadedDocuments = await validateStoredFiles(
    uploads.documents,
    formId,
    "documents",
    submissionId,
  );
  const tempImages = values.images.filter((image) =>
    image.id.startsWith("temp-image-"),
  );
  const tempDocuments = values.documents.filter((document) =>
    document.id.startsWith("temp-document-"),
  );

  assertPendingFilesMatch({
    existingNames: values.images
      .filter((image) => !image.id.startsWith("temp-image-"))
      .map((image) => image.fileName ?? "")
      .filter(Boolean),
    kind: "images",
    pendingNames: tempImages.map((image) => image.fileName ?? ""),
    uploadedFiles: uploadedImages,
  });
  assertPendingFilesMatch({
    existingNames: values.documents
      .filter((document) => !document.id.startsWith("temp-document-"))
      .map((document) => document.fileName ?? document.name),
    kind: "documents",
    pendingNames: tempDocuments.map((document) => document.name),
    uploadedFiles: uploadedDocuments,
  });

  const totalUploadBytes = [...uploadedImages, ...uploadedDocuments].reduce(
    (total, file) => total + file.size,
    0,
  );
  if (totalUploadBytes > MAX_TOTAL_UPLOAD_BYTES) {
    throw new Error("The combined upload must not exceed 100MB.");
  }

  const currentImages = reconcileExistingMedia(
    values.images,
    current.images,
    "temp-image-",
  );
  const currentDocuments = reconcileExistingMedia(
    values.documents,
    current.documents,
    "temp-document-",
  );
  let nextImage = 0;
  let nextDocument = 0;

  return {
    images: currentImages.map((image) =>
      image ? image : imageFromUpload(uploadedImages[nextImage++]),
    ),
    documents: currentDocuments.map((document) =>
      document
        ? document
        : documentFromUpload(uploadedDocuments[nextDocument++]),
    ),
  };
}

export function uploadedSubmissionKeys(
  uploads: SubmissionUploads,
  formId: string,
  submissionId: string,
) {
  const prefix = `${buildStoragePrefix(
    submissionUploadRootScope(formId, submissionId),
  )}/`;

  return [...uploads.images, ...uploads.documents]
    .map((file) => file.url)
    .filter((key) => key.startsWith(prefix));
}

export function removedSubmissionKeys(
  current: CarSubmission,
  saved: CarSubmission,
) {
  const savedKeys = new Set(
    [...saved.images, ...saved.documents]
      .map((item) => item.key)
      .filter((key): key is string => Boolean(key)),
  );

  return [...current.images, ...current.documents]
    .map((item) => item.key)
    .filter(
      (key): key is string => typeof key === "string" && !savedKeys.has(key),
    );
}

export async function deleteSubmissionKeys(keys: string[], reason: string) {
  const results = await Promise.allSettled(
    keys.map((key) => storageAdaptorDeleteFile(key)),
  );
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length) {
    logger.error("S3", "Submission file cleanup was incomplete", {
      failed: failed.length,
      reason,
    });
  }
}
