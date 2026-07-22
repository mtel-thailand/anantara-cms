import { z } from "zod";

import { SUBMISSION_STATUSES } from "@/src/features/cars/submission/submission.types";
import { normalizedFileName } from "@/src/lib/string";

const optionalString = z.string();
const currentYear = new Date().getFullYear();
const yearError = "Enter a valid 4-digit year of manufacture.";
const maxDocumentBytes = 10 * 1024 * 1024;
const documentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const documentFileSchema = z
  .custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    "Choose a valid document.",
  )
  .refine(
    (file) => documentTypes.has(file.type) || /\.(pdf|docx?)$/i.test(file.name),
    "Documents must be PDF, DOC, or DOCX files.",
  )
  .refine(
    (file) => file.size <= maxDocumentBytes,
    "Documents must be no larger than 10MB each.",
  );

export const submissionReviewSchema = z
  .object({
    classId: optionalString,
    status: z.enum(SUBMISSION_STATUSES),
    owner: z.object({
      lastName: z.string().trim().min(1, "Enter the owner's name."),
      firstName: z.string().trim().min(1, "Enter the owner's first name(s)."),
      email: z
        .string()
        .trim()
        .min(1, "Enter the owner's email.")
        .email("Enter a valid email address."),
      mobile: optionalString,
      address: optionalString,
      postcode: optionalString,
    }),
    vehicle: z.object({
      make: z.string().trim().min(1, "Enter the make / marque."),
      model: z.string().trim().min(1, "Enter the model."),
      bodyStyle: optionalString,
      coachbuilder: optionalString,
      exteriorColour: optionalString,
      chassisNumber: optionalString,
      engineNumber: optionalString,
    }),
    year: z
      .number({ error: yearError })
      .int(yearError)
      .min(1880, yearError)
      .max(currentYear + 1, yearError),
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
    documentFiles: z.array(documentFileSchema).max(10, {
      message: "You can upload at most 10 documents.",
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
      .max(10, "A car can have at most 10 images."),
    internalComments: optionalString,
    infoRequests: z.array(
      z.object({
        id: z.string(),
        message: z.string(),
        sentDate: z.string(),
      }),
    ),
    newInfoMessage: optionalString,
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
          message: `A file named "${file.name}" has already been added.`,
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
        message: "Add at least one image.",
        path: ["images"],
      });
    }

    if (!data.history.en.trim()) {
      context.addIssue({
        code: "custom",
        message: "Add the vehicle history in English.",
        path: ["history", "en"],
      });
    }

    if (!data.documents.length && !data.documentFiles.length) {
      context.addIssue({
        code: "custom",
        message: "Add at least one supporting document.",
        path: ["documentFiles"],
      });
    }

    if (
      data.status === "requested_info" &&
      !data.infoRequests.length &&
      !data.newInfoMessage.trim()
    ) {
      context.addIssue({
        code: "custom",
        message: "Write a message telling the owner what's needed.",
        path: ["newInfoMessage"],
      });
    }
  });

export type SubmissionReviewFormValues = z.infer<typeof submissionReviewSchema>;
