import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import type { ApiContext } from "@/src/lib/api/types";
import { withApiLogger } from "@/src/lib/api/with-api-logger";
import { withValidate } from "@/src/lib/api/with-validate";
import { storageAdaptorGetUploadUrl } from "@/src/lib/s3/client";
import { buildStoragePrefix } from "@/src/lib/s3/key";
import type { InferSchemas, SchemaMap } from "@/src/types/api-schema";

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const CLIENT_UPLOAD_PREFIX = `${buildStoragePrefix([], "client")}/`;
const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const schemas = {
  body: z
    .object({
      key: z
        .string()
        .trim()
        .min(1, "S3 key is required.")
        .max(1024)
        .refine(
          (key) =>
            !key.startsWith("/") &&
            !key.endsWith("/") &&
            !key.includes(".."),
          "Invalid S3 key.",
        )
        .refine(
          (key) => key.startsWith(CLIENT_UPLOAD_PREFIX),
          `S3 key must start with ${CLIENT_UPLOAD_PREFIX}`,
        ),
      contentType: z.enum(ACCEPTED_FILE_TYPES, {
        error: "Unsupported file type.",
      }),
      size: z
        .number()
        .int()
        .min(1, "File cannot be empty.")
        .max(MAX_FILE_SIZE, `Maximum file size is ${MAX_FILE_SIZE_MB}MB.`),
    })
    .strict(),
} satisfies SchemaMap;

type Context = ApiContext & InferSchemas<typeof schemas>;

async function handler(request: NextRequest, context: Context) {
  const upload = await storageAdaptorGetUploadUrl({
    key: context.body.key,
    contentType: context.body.contentType,
    size: context.body.size,
  });

  return NextResponse.json(upload, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

const validated = withValidate<typeof schemas, ApiContext>(schemas, handler);
export const POST = withApiLogger(validated);
