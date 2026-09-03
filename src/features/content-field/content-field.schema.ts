import { z } from "zod";
import {
  getContentFieldDefinitions,
  getRequiredContentFieldVariants,
} from "./content-field.config";
import { hasContentFieldValue } from "./content-field.helpers";
import { CONTENT_FIELD_PAGE_KEYS } from "./content-field.types";
import type { ContentFieldData, ContentFieldPageKey } from "./content-field.types";

const richTextValueSchema = z
  .object({
    content: z.string(),
    format: z.literal("html"),
  })
  .strict();

const plainTextValueSchema = z
  .object({
    text: z.string(),
  })
  .strict();

const emailValueSchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

const contentFieldValueSchema = z.union([
  emailValueSchema,
  richTextValueSchema,
  plainTextValueSchema,
]);

const contentFieldFieldDataSchema = z
  .object({
    app: z
      .object({
        en: z.string(),
      })
      .strict()
      .optional(),
    desktop: z
      .object({
        en: z.string(),
        it: z.string(),
      })
      .strict()
      .optional(),
    shared: z
      .object({
        und: z.string(),
      })
      .strict()
      .optional(),
    web: z
      .object({
        und: z.string(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const contentFieldDataSchema = z.record(
  z.string().min(1),
  contentFieldFieldDataSchema,
);

const contentFieldFormSchema = z
  .object({
    data: contentFieldDataSchema,
  })
  .strict();

export function getContentFieldFormSchema(pageKey: ContentFieldPageKey) {
  return contentFieldFormSchema.superRefine(({ data }, context) => {
    for (const { fieldKey, variant } of getRequiredContentFieldVariants(
      pageKey,
    )) {
      const definition = getContentFieldDefinitions(pageKey).find(
        (field) => field.key === fieldKey,
      );
      const [channel, locale] = variant.split(":") as [
        "web" | "app" | "shared",
        "en" | "und",
      ];
      const content =
        channel === "web"
          ? locale === "und"
            ? data[fieldKey]?.web?.und
            : data[fieldKey]?.desktop?.[locale]
          : channel === "app"
            ? data[fieldKey]?.app?.en
            : data[fieldKey]?.shared?.und;

      if (!definition || !hasContentFieldValue(definition.contentType, content)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required content is missing.",
          path: [
            "data",
            fieldKey,
            channel === "web"
              ? locale === "und"
                ? "web"
                : "desktop"
              : channel === "app"
                ? "app"
                : "shared",
            locale,
          ],
        });
      }
    }

    if (pageKey === "gallery") {
      const email = (data.contact_email?.web?.und ?? "").trim();
      if (email && !z.string().email().safeParse(email).success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A valid contact email is required.",
          path: ["data", "contact_email", "web", "und"],
        });
      }
    }
  });
}

export type ContentFieldFormValues = {
  data: ContentFieldData;
};

export const publishContentFieldSchema = z
  .object({
    data: contentFieldDataSchema,
    pageKey: z.enum(CONTENT_FIELD_PAGE_KEYS),
  })
  .strict();

export const contentFieldSnapshotSchema = z
  .object({
    pageKey: z.enum(CONTENT_FIELD_PAGE_KEYS),
    version: z.number().int().positive(),
    values: z
      .array(
        z
          .object({
            channel: z.enum(["web", "app", "shared"]),
            fieldKey: z.string().min(1),
            locale: z.enum(["en", "it", "und"]),
            value: contentFieldValueSchema,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const contentFieldAdminRowsSchema = z.array(
  z
    .object({
      channel: z.enum(["web", "app", "shared"]).nullable(),
      field_key: z.string().min(1),
      field_value: contentFieldValueSchema.nullable(),
      locale: z.enum(["en", "it", "und"]).nullable(),
      page_key: z.enum(CONTENT_FIELD_PAGE_KEYS),
      page_version: z.coerce.number().int().positive(),
    })
    .passthrough(),
);

export const contentFieldPageSchema = z
  .object({
    key: z.enum(CONTENT_FIELD_PAGE_KEYS),
    version: z.coerce.number().int().positive(),
  })
  .strict();

export const contentFieldDraftStorageSchema = z
  .object({
    draft: publishContentFieldSchema,
    version: z.literal(5),
  })
  .strict();

export type PublishContentFieldInput = z.infer<
  typeof publishContentFieldSchema
>;
