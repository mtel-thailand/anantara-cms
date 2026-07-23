import { z } from "zod";

export const StorageFileSchema = z
  .object({
    url: z.string().min(1),
    publicUrl: z.string().min(1),
    fileName: z.string().min(1),
    contentType: z.string().min(1),
    size: z.number().int().nonnegative(),
    seq: z.number().int().positive(),
  })
  .strict();

export type StorageFile = z.infer<typeof StorageFileSchema>;

export const UploadResponseSchema = z
  .object({
    src: z.union([StorageFileSchema, z.array(StorageFileSchema)]),
    message: z.string().optional(),
  })
  .strict();

export type UploadResponse = z.infer<typeof UploadResponseSchema>;
