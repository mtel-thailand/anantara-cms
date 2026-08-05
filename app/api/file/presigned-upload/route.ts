import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import type { ApiContext } from "@/src/lib/api/types";
import { withApiLogger } from "@/src/lib/api/with-api-logger";
import { withAuth } from "@/src/lib/api/with-auth";
import { withValidate } from "@/src/lib/api/with-validate";
import { storageAdaptorGetUploadUrl } from "@/src/lib/s3/client";
import {
  buildStoragePrefix,
  normalizeStorageFolder,
} from "@/src/lib/s3/key";
import { ACCEPTED_FILE_TYPES } from "@/src/lib/s3/presigned-upload.constants";
import type { InferSchemas, SchemaMap } from "@/src/types/api-schema";

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

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
            !key.endsWith("/") &&
            !key.includes("..") &&
            !key.split("/").includes("."),
          "Invalid S3 key.",
        ),
      contentType: z
        .string()
        .refine(
          (contentType) => ACCEPTED_FILE_TYPES.includes(contentType),
          "Unsupported file type.",
        ),
      fileName: z.string().trim().min(1).max(255),
      scope: z.array(z.string().min(1).max(128)).max(12).default([]),
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
  if (!context.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const normalizedKey = normalizeStorageFolder(context.body.key);
  const scopedUploadPrefix = `${buildStoragePrefix(context.body.scope)}/`;
  const key = normalizedKey.startsWith(scopedUploadPrefix)
    ? normalizedKey
    : `${scopedUploadPrefix}${normalizedKey}`;

  const upload = await storageAdaptorGetUploadUrl({
    key,
    contentType: context.body.contentType,
    fileName: context.body.fileName,
    scope: context.body.scope,
    size: context.body.size,
    uploadedBy: context.user.id,
  });

  return NextResponse.json(upload, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

const validated = withValidate<typeof schemas, ApiContext>(schemas, handler);
export const POST = withApiLogger(withAuth(validated));
