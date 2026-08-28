import { z } from "zod";
import { CONTENT_FIELD_PAGE_KEYS } from "./content-field.types";

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

const contentFieldDraftSchema = z
  .object({
    data: contentFieldDataSchema,
    pageKey: z.enum(CONTENT_FIELD_PAGE_KEYS),
    version: z.number().int().positive(),
  })
  .strict();

export const publishContentFieldSchema = contentFieldDraftSchema;

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
    draft: contentFieldDraftSchema,
    version: z.literal(3),
  })
  .strict();

export type PublishContentFieldInput = z.infer<
  typeof publishContentFieldSchema
>;
