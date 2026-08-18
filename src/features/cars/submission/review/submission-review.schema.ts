import { z } from "zod";

import { SUBMISSION_STATUSES } from "@/src/features/cars/submission/submission.types";
import { normalizedFileName } from "@/src/lib/string";
import type { Translator } from "@/src/types/translation";
import { SUBMISSION_REVIEW_MAX_FILE_SIZE_BYTES } from "@/src/features/cars/submission/review/submission-review.constants";

const optionalString = z.string();
const documentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
function getDocumentFileSchema(t: Translator) {
  return z
  .custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    t("documentInvalid"),
  )
  .refine(
    (file) => documentTypes.has(file.type) || /\.(pdf|docx?)$/i.test(file.name),
    t("documentType"),
  )
  .refine(
    (file) => file.size <= SUBMISSION_REVIEW_MAX_FILE_SIZE_BYTES,
    t("documentSize"),
  );
}

export function getSubmissionReviewSchema(t: Translator) {
  const yearError = t("year");
  const currentYear = new Date().getFullYear();
  return z
  .object({
    classId: optionalString,
    status: z.enum(SUBMISSION_STATUSES),
    owner: z.object({
      lastName: z.string().trim().min(1, t("ownerName")),
      firstName: z.string().trim().min(1, t("ownerFirstName")),
      email: z
        .string()
        .trim()
        .min(1, t("ownerEmail"))
        .email(t("validEmail")),
      mobile: optionalString,
      address: optionalString,
      postcode: optionalString,
    }),
    vehicle: z.object({
      make: z.string().trim().min(1, t("make")),
      model: z.string().trim().min(1, t("model")),
      bodyStyle: optionalString,
      coachbuilder: optionalString,
      exteriorColour: optionalString,
      interiorColour: optionalString,
      chassisNumber: optionalString,
      engineNumber: optionalString,
    }),
    year: z
      .number({ error: yearError })
      .max(currentYear, t("yearFuture", { year: currentYear })),
    history: z.object({
      en: optionalString,
      it: optionalString,
    }),
    documents: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        key: z.string().optional(),
        fileName: z.string().optional(),
        contentType: z.string().optional(),
        size: z.number().optional(),
        seq: z.number().optional(),
        additionalPhotoLink: z.boolean().optional(),
      }),
    ),
    documentFiles: z.array(getDocumentFileSchema(t)).max(10, {
      message: t("documentLimit"),
    }),
    images: z
      .array(
        z.object({
          id: z.string(),
          url: z.string(),
          key: z.string().optional(),
          fileName: z.string().optional(),
          contentType: z.string().optional(),
          size: z.number().optional(),
          seq: z.number().optional(),
        }),
      )
      .max(10, t("imageLimit")),
    internalComments: optionalString,
    infoRequests: z.array(
      z.object({
        id: z.string(),
        message: z.string(),
        sentDate: z.string(),
      }),
    ),
    newInfoMessage: optionalString,
    newInfoMessageRequired: z.boolean(),
  })
  .superRefine((data, context) => {
    const documentNames = new Set(
      data.documents.map((document) =>
        normalizedFileName(document.fileName ?? document.name),
      ),
    );
    data.documentFiles.forEach((file, index) => {
      const name = normalizedFileName(file.name);
      if (documentNames.has(name)) {
        context.addIssue({
          code: "custom",
          message: t("duplicateDocument", { name: file.name }),
          path: ["documentFiles", index],
        });
        return;
      }

      documentNames.add(name);
    });

    if (data.status === "archived") return;

    if (!data.images.length) {
      context.addIssue({
        code: "custom",
        message: t("imageRequired"),
        path: ["images"],
      });
    }

    if (!data.history.en.trim()) {
      context.addIssue({
        code: "custom",
        message: t("englishHistory"),
        path: ["history", "en"],
      });
    }

    if (!data.documents.length && !data.documentFiles.length) {
      context.addIssue({
        code: "custom",
        message: t("documentRequired"),
        path: ["documentFiles"],
      });
    }

    if (
      data.status === "requested_info" &&
      !data.newInfoMessage.trim()
    ) {
      context.addIssue({
        code: "custom",
        message: t("messageRequired"),
        path: ["newInfoMessage"],
      });
    }
  });
}

export type SubmissionReviewFormValues = z.infer<
  ReturnType<typeof getSubmissionReviewSchema>
>;
