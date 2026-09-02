import { z } from "zod";

import type {
  BestInClassEntry,
  BestOfShowEntry,
  SpecialAwardItem,
} from "./awards.types";
import type { ContentFieldData } from "@/src/features/content-field/content-field.types";

const nullableUuid = z.string().uuid().nullable();
const carIdSchema = z.string().trim().min(1);
const nullableCarId = carIdSchema.nullable();
const specialAwardCarIdSchema = z
  .string()
  .trim()
  .min(1, "Select a car for this award.");

export const awardDescriptionFormSchema = z.object({
  description: z.string().trim().min(1),
});

export type AwardDescriptionFormValues = z.infer<
  typeof awardDescriptionFormSchema
>;

export const publishBestInClassSchema = z.object({
  entries: z.array(
    z.object({
      id: nullableUuid,
      carId: carIdSchema,
      categoryId: z.number().int().positive(),
      role: z.enum(["winner", "runnerUp"]),
    }),
  ),
});

const publishBestInClassEnvelopeSchema = z
  .object({
    entries: z.array(z.unknown()),
  })
  .strict();

function isUnassignedBestInClassEntry(value: unknown) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "carId" in value &&
    value.carId === null
  );
}

export function parsePublishBestInClassInput(payload: unknown) {
  const envelope = publishBestInClassEnvelopeSchema.parse(payload);

  return publishBestInClassSchema.parse({
    entries: envelope.entries.filter(
      (entry) => !isUnassignedBestInClassEntry(entry),
    ),
  });
}

export const publishBestOfShowSchema = z.object({
  entry: z.object({ id: nullableUuid, carId: nullableCarId }),
});

const specialAwardFormBaseSchema = z.object({
  title: z.string().trim().min(1, "English is required."),
  titleIt: z.string().trim(),
  carId: nullableCarId,
  personName: z.string().trim(),
  description: z.string().trim(),
  descriptionIt: z.string().trim(),
  imageUrl: z.string().trim(),
});

export const carAwardFormSchema = specialAwardFormBaseSchema.extend({
  carId: specialAwardCarIdSchema,
});

export const notableFigureAwardFormSchema = specialAwardFormBaseSchema
  .extend({
    personName: z.string().trim().min(1, "Name is required."),
    description: z.string().trim().min(1, "English is required."),
  })
  .superRefine((value, context) => {
    const hasItalianContent = Boolean(value.titleIt || value.descriptionIt);

    if (hasItalianContent && !value.titleIt) {
      context.addIssue({
        code: "custom",
        path: ["titleIt"],
        message: "Complete the Italian translation, or leave Italian blank.",
      });
    }
    if (hasItalianContent && !value.descriptionIt) {
      context.addIssue({
        code: "custom",
        path: ["descriptionIt"],
        message: "Complete the Italian translation, or leave Italian blank.",
      });
    }
  });

export const specialAwardFormSchema = specialAwardFormBaseSchema;
export type SpecialAwardFormValues = z.infer<typeof specialAwardFormSchema>;

const publishSpecialAwardBaseSchema = specialAwardFormBaseSchema.extend({
  id: z.string(),
  persisted: z.boolean(),
  imageUrl: z.string().trim().nullable(),
  sequence: z.number().int().positive(),
  removed: z.boolean(),
});

const publishCarAwardSchema = publishSpecialAwardBaseSchema.extend({
  kind: z.literal("car"),
  carId: specialAwardCarIdSchema,
});

const publishNotableFigureAwardSchema = publishSpecialAwardBaseSchema
  .extend({
    kind: z.literal("figure"),
    personName: z.string().trim().min(1, "Name is required."),
  })
  .superRefine((value, context) => {
    if (!value.persisted && !value.removed && !value.description) {
      context.addIssue({
        code: "custom",
        path: ["description"],
        message: "English is required.",
      });
    }

    const hasItalianContent = Boolean(value.titleIt || value.descriptionIt);

    if (hasItalianContent && !value.titleIt) {
      context.addIssue({
        code: "custom",
        path: ["titleIt"],
        message: "Complete the Italian translation, or leave Italian blank.",
      });
    }
    if (hasItalianContent && !value.descriptionIt) {
      context.addIssue({
        code: "custom",
        path: ["descriptionIt"],
        message: "Complete the Italian translation, or leave Italian blank.",
      });
    }
  });

export const publishSpecialAwardsSchema = z.object({
  items: z
    .array(z.union([publishCarAwardSchema, publishNotableFigureAwardSchema]))
    .superRefine((items, context) => {
      items.forEach((item, index) => {
        if (item.persisted && !z.string().uuid().safeParse(item.id).success) {
          context.addIssue({
            code: "custom",
            path: [index, "id"],
            message: "Invalid persisted award ID.",
          });
        }
      });
    }),
});

export type PublishBestInClassInput = z.infer<typeof publishBestInClassSchema>;
export type PublishBestOfShowInput = z.infer<typeof publishBestOfShowSchema>;
export type PublishSpecialAwardsInput = z.infer<
  typeof publishSpecialAwardsSchema
>;

const contentFieldDataDraftSchema: z.ZodType<ContentFieldData> = z.record(
  z.string(),
  z
    .object({
      app: z.object({ en: z.string() }).strict().optional(),
      desktop: z.record(z.enum(["en", "it"]), z.string()).optional(),
      shared: z.object({ und: z.string() }).strict().optional(),
    })
    .strict(),
);

const bestInClassEntryDraftSchema: z.ZodType<BestInClassEntry> = z
  .object({
    id: z.string().nullable(),
    carId: nullableCarId,
    categoryId: z.number().int().positive(),
    role: z.enum(["winner", "runnerUp"]),
  })
  .strict();

const bestOfShowEntryDraftSchema: z.ZodType<BestOfShowEntry> = z
  .object({
    id: z.string().nullable(),
    carId: nullableCarId,
  })
  .strict();

const specialAwardItemDraftSchema: z.ZodType<SpecialAwardItem> = z
  .object({
    id: z.string().min(1),
    persisted: z.boolean(),
    kind: z.enum(["car", "figure"]),
    title: z.string(),
    titleIt: z.string(),
    carId: nullableCarId,
    personName: z.string(),
    description: z.string(),
    descriptionIt: z.string(),
    imageUrl: z.string().nullable(),
    sequence: z.number().int().positive(),
    removed: z.boolean(),
  })
  .strict();

export type BestInClassAwardDraft = {
  entries: BestInClassEntry[];
  content: ContentFieldData;
};

export type BestOfShowAwardDraft = {
  entry: BestOfShowEntry;
  content: ContentFieldData;
};

export type SpecialAwardsDraft = {
  items: SpecialAwardItem[];
  content: ContentFieldData;
};

const bestInClassAwardDraftStorageSchema: z.ZodType<{
  version: 1;
  data: BestInClassAwardDraft;
}> = z
  .object({
    version: z.literal(1),
    data: z
      .object({
        entries: z.array(bestInClassEntryDraftSchema),
        content: contentFieldDataDraftSchema,
      })
      .strict(),
  })
  .strict();

const bestOfShowAwardDraftStorageSchema: z.ZodType<{
  version: 1;
  data: BestOfShowAwardDraft;
}> = z
  .object({
    version: z.literal(1),
    data: z
      .object({
        entry: bestOfShowEntryDraftSchema,
        content: contentFieldDataDraftSchema,
      })
      .strict(),
  })
  .strict();

const specialAwardsDraftStorageSchema: z.ZodType<{
  version: 1;
  data: SpecialAwardsDraft;
}> = z
  .object({
    version: z.literal(1),
    data: z
      .object({
        items: z.array(specialAwardItemDraftSchema),
        content: contentFieldDataDraftSchema,
      })
      .strict(),
  })
  .strict();

export function storedBestInClassAwardDraft(
  value: unknown,
): BestInClassAwardDraft | null {
  const parsed = bestInClassAwardDraftStorageSchema.safeParse(value);
  return parsed.success ? parsed.data.data : null;
}

export function storedBestOfShowAwardDraft(
  value: unknown,
): BestOfShowAwardDraft | null {
  const parsed = bestOfShowAwardDraftStorageSchema.safeParse(value);
  return parsed.success ? parsed.data.data : null;
}

export function storedSpecialAwardsDraft(
  value: unknown,
): SpecialAwardsDraft | null {
  const parsed = specialAwardsDraftStorageSchema.safeParse(value);
  return parsed.success ? parsed.data.data : null;
}
