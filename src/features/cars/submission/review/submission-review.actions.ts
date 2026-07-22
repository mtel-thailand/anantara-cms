"use server";

import { z } from "zod";

import {
  submissionFormPayload,
  toCarSubmission,
  vehiclePayload,
} from "@/src/features/cars/submission/api/submission.serializer";
import type {
  CarSubmission,
  SubmissionDocument,
  SubmissionImage,
  SubmissionStatus,
  SubmissionVehicleWithFormRow,
} from "@/src/features/cars/submission/submission-types";
import { logger } from "@/src/lib/logger";
import {
  buildStoragePublicUrl,
  storageAdaptorDeleteFile,
  storageAdaptorGetFileMetadata,
  type StorageFile,
} from "@/src/lib/s3/client";
import { buildStoragePrefix } from "@/src/lib/s3/key";
import {
  EmailTemplate,
  sendEmail,
  type SubmissionEmailStatus,
} from "@/src/lib/ses/email";
import { createClient } from "@/src/lib/supabase/server";
import { unwrap } from "@/src/lib/supabase/unwrap";
import {
  submissionReviewSchema,
  type SubmissionReviewFormValues,
} from "./submission-review.schema";
import { submissionFromFormValues } from "./helpers";
import { normalizedFileName } from "@/src/lib/string";
import { StorageFileSchema } from "@/src/schema/storage-file.schema";
import { storageScopesEqual } from "@/src/lib/s3/scope";
import {
  submissionUploadRootScope,
  submissionUploadScope,
  type SubmissionUploadKind,
} from "../api/submission-upload";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type SubmissionFormRow = SubmissionVehicleWithFormRow["car_submissions_form"];
type CanonicalSubmission = {
  form: SubmissionFormRow;
  submission: CarSubmission;
};

const EMAIL_STATUSES = new Set<SubmissionEmailStatus>([
  "approved",
  "not_selected",
  "requested_info",
  "under_review",
  "waitlist",
]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const DOCUMENT_TYPES = new Set([
  "application/msword",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_KIND = 10;
const MAX_TOTAL_UPLOAD_BYTES = 100 * 1024 * 1024;
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

export type SubmissionUploads = {
  documents: StorageFile[];
  images: StorageFile[];
};

async function getCanonicalSubmission(
  supabase: ServerSupabaseClient,
  id: string,
): Promise<CanonicalSubmission> {
  const [{ data, error }, { data: car, error: carError }] = await Promise.all([
    supabase
      .from("car_submission_vehicles")
      .select(
        `
        *,
        car_submissions_form!inner (*)
      `,
      )
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("cars")
      .select("category_id")
      .eq("submission_vehicle_id", id)
      .limit(1)
      .maybeSingle(),
  ]);

  const vehicle: SubmissionVehicleWithFormRow | null = unwrap(data, error);
  if (carError) throw carError;
  if (!vehicle) throw new Error("Car submission vehicle was not found.");

  return {
    form: vehicle.car_submissions_form,
    submission: toCarSubmission(vehicle.car_submissions_form, vehicle, car),
  };
}

function resolveFinalStatus(
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

function parseSavePayload(payload: unknown) {
  const parsed = savePayloadSchema.parse(payload);

  return {
    expectedUpdatedAt: parsed.expectedUpdatedAt,
    formId: parsed.formId,
    uploads: parsed.uploads,
    values: submissionReviewSchema.parse(parsed.values),
  };
}

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
    // Internal UI identity only. The serializer does not persist image IDs.
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
    // Internal UI identity only. The serializer does not persist document IDs.
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

async function deleteKeys(keys: string[], reason: string) {
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

function removedKeys(current: CarSubmission, saved: CarSubmission) {
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
      carId: submission.carId,
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
  const { expectedUpdatedAt, formId, uploads, values } =
    parseSavePayload(payload);
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const uploadedKeys = [...uploads.images, ...uploads.documents].map(
    (file) => file.url,
  );
  const ownedPrefix = `${buildStoragePrefix(
    submissionUploadRootScope(formId, id),
  )}/`;
  const ownedUploadedKeys = uploadedKeys.filter((key) =>
    key.startsWith(ownedPrefix),
  );
  let mediaSaved = false;

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

    const uploadedImages = await validateStoredFiles(
      uploads.images,
      formId,
      "images",
      id,
    );
    const uploadedDocuments = await validateStoredFiles(
      uploads.documents,
      formId,
      "documents",
      id,
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
      current.submission.images,
      "temp-image-",
    );
    const currentDocuments = reconcileExistingMedia(
      values.documents,
      current.submission.documents,
      "temp-document-",
    );
    const finalStatus = resolveFinalStatus(current.submission.status, values);
    let nextImage = 0;
    let nextDocument = 0;
    const images = currentImages.map((image) =>
      image ? image : imageFromUpload(uploadedImages[nextImage++]),
    );
    const documents = currentDocuments.map((document) =>
      document
        ? document
        : documentFromUpload(uploadedDocuments[nextDocument++]),
    );
    const submission = submissionFromFormValues(
      current.submission,
      {
        ...values,
        documents,
        images,
        infoRequests: current.submission.infoRequests,
      },
      finalStatus,
    );

    const { data: vehicle, error: vehicleError } = await supabase
      .from("car_submission_vehicles")
      .update(vehiclePayload(submission))
      .eq("id", id)
      .eq("submission_id", current.form.id)
      .eq("updated_at", expectedUpdatedAt)
      .select("id")
      .maybeSingle();
    if (vehicleError) throw vehicleError;
    if (!vehicle) {
      throw new Error(
        "This submission was changed by another reviewer. Refresh and try again.",
      );
    }
    mediaSaved = true;

    const { data: form, error: formError } = await supabase
      .from("car_submissions_form")
      .update(submissionFormPayload(submission))
      .eq("id", current.form.id)
      .select("id")
      .maybeSingle();
    if (formError) throw formError;
    if (!form) {
      throw new Error("The submission form was not found.");
    }

    const saved = await getCanonicalSubmission(supabase, id);
    const obsoleteKeys = removedKeys(current.submission, saved.submission);
    if (obsoleteKeys.length) {
      await deleteKeys(obsoleteKeys, "removed from submission");
    }

    const reviewNoteChanged =
      finalStatus === "requested_info" &&
      JSON.stringify(submission.infoRequests) !==
        JSON.stringify(current.submission.infoRequests);
    const emailAttempted =
      EMAIL_STATUSES.has(finalStatus as SubmissionEmailStatus) &&
      (finalStatus !== current.submission.status || reviewNoteChanged);
    let emailSent = false;

    if (emailAttempted) {
      try {
        const accessToken = saved.form.access_token ?? "";
        await sendStatusEmail(
          saved.form,
          saved.submission,
          finalStatus as SubmissionEmailStatus,
          values.newInfoMessage.trim() ||
            saved.submission.infoRequests.at(-1)?.message ||
            "",
          accessToken,
        );
        emailSent = true;
      } catch (emailError) {
        logger.error("CAR-SUBMISSIONS", "Status email could not be sent", {
          error:
            emailError instanceof Error
              ? emailError.message
              : String(emailError),
          submissionId: id,
          status: finalStatus,
        });
      }
    }

    return {
      emailAttempted,
      emailSent,
      finalStatus,
      submission: saved.submission,
    };
  } catch (error) {
    if (!mediaSaved && ownedUploadedKeys.length) {
      await deleteKeys(ownedUploadedKeys, "save failed");
    }
    throw error;
  }
}
