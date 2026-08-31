import { z } from "zod";
import {
  getRequiredContentFieldVariants,
} from "./content-field.config";
import { CONTENT_FIELD_PAGE_KEYS } from "./content-field.types";
import type { ContentFieldData, ContentFieldPageKey } from "./content-field.types";

const richTextValueSchema = z
  .object({
    content: z.string(),
    format: z.literal("html"),
  })
  .strict();

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
      const [channel, locale] = variant.split(":") as ["web" | "app", "en"];
      const content =
        channel === "web"
          ? data[fieldKey]?.desktop?.[locale]
          : data[fieldKey]?.app?.en;

      if (!content?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required content is missing.",
          path: [
            "data",
            fieldKey,
            channel === "web" ? "desktop" : "app",
            locale,
          ],
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
            channel: z.enum(["web", "app"]),
            fieldKey: z.string().min(1),
            locale: z.enum(["en", "it"]),
            value: richTextValueSchema,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const contentFieldAdminRowsSchema = z.array(
  z
    .object({
      channel: z.enum(["web", "app"]).nullable(),
      field_key: z.string().min(1),
      field_value: richTextValueSchema.nullable(),
      locale: z.enum(["en", "it"]).nullable(),
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
