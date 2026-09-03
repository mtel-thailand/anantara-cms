import { z } from "zod";

import type { GalleryItemsData } from "../gallery.types";

export const galleryGroupFormSchema = z.object({
  name: z.string().trim().min(1, "Add the tab name in English."),
  nameIt: z.string().trim(),
});

export type GalleryGroupFormValues = z.infer<typeof galleryGroupFormSchema>;

const galleryGroupSchema = z
  .object({
    id: z.string().min(1),
    persisted: z.boolean(),
    name: z.string().trim().min(1, "Add the tab name in English."),
    nameIt: z.string().trim(),
    sequence: z.number().int().positive(),
    removed: z.boolean(),
  })
  .strict();

const galleryImageSchema = z
  .object({
    id: z.string().min(1),
    persisted: z.boolean(),
    groupId: z.string().min(1),
    imageKey: z.string().min(1),
    imageUrl: z.string().min(1),
    sequence: z.number().int().positive(),
    removed: z.boolean(),
  })
  .strict();

export const publishGalleryItemsSchema = z
  .object({
    groups: z.array(galleryGroupSchema),
    images: z.array(galleryImageSchema),
  })
  .strict()
  .superRefine((value, context) => {
    const liveGroups = new Set(
      value.groups.filter((group) => !group.removed).map((group) => group.id),
    );
    const groupsWithImages = new Set(
      value.images
        .filter((image) => !image.removed)
        .map((image) => image.groupId),
    );

    value.groups.forEach((group, index) => {
      if (!group.removed && !groupsWithImages.has(group.id)) {
        context.addIssue({
          code: "custom",
          path: ["groups", index],
          message: "Every gallery group must contain at least one image.",
        });
      }
    });

    value.images.forEach((image, index) => {
      if (!image.removed && !liveGroups.has(image.groupId)) {
        context.addIssue({
          code: "custom",
          path: ["images", index, "groupId"],
          message: "Gallery image references a missing group.",
        });
      }
    });
  });

export type PublishGalleryItemsInput = z.infer<
  typeof publishGalleryItemsSchema
>;

const galleryDraftEnvelopeSchema: z.ZodType<{
  version: 1;
  data: GalleryItemsData;
}> = z
  .object({
    version: z.literal(1),
    data: z
      .object({
        groups: z.array(galleryGroupSchema),
        images: z.array(galleryImageSchema),
      })
      .strict(),
  })
  .strict();

export function parseGalleryItemsDraft(value: unknown) {
  const parsed = galleryDraftEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data.data : null;
}
