import {
  storageAdaptorDeleteFile,
  storageAdaptorUploadFile,
} from "@/src/lib/s3/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { InferSchemas, SchemaMap } from "@/src/types/api-schema";
import { ApiContext } from "@/src/lib/api/types";
import { withValidate } from "@/src/lib/api/with-validate";
import { withApiLogger } from "@/src/lib/api/with-api-logger";
import { logger } from "@/src/lib/logger";
import { withAuth } from "@/src/lib/api/with-auth";

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
];

const postSchemas = {
  files: z
    .array(z.instanceof(File))
    .min(1, "At least 1 file is required.")
    .max(MAX_FILES, `Maximum ${MAX_FILES} files are allowed.`)
    .refine(
      (files) => files.every((file) => file.size <= MAX_FILE_SIZE),
      `Max file size is ${MAX_FILE_SIZE_MB}MB per file.`,
    )
    .refine(
      (files) =>
        files.every((file) => ACCEPTED_IMAGE_TYPES.includes(file.type)),
      "Only .jpg, .png and .webp formats are supported.",
    ),
} satisfies SchemaMap;

type PostContextReturnType = ApiContext & InferSchemas<typeof postSchemas>;

const deleteSchemas = {
  body: z
    .object({
      key: z.string().min(1, "S3 key is required."),
    })
    .strict(),
} satisfies SchemaMap;

type DeleteContextReturnType = ApiContext & InferSchemas<typeof deleteSchemas>;

async function postRouteHandler(
  request: NextRequest,
  ctx: PostContextReturnType,
) {
  if (!ctx.files?.length) {
    logger.warn("FILE", "no files found in validated context");
    return NextResponse.json({ message: "No image found" }, { status: 400 });
  }

  const files = ctx.files;

  logger.info("FILE", "upload request validated", {
    count: files.length,
    files: files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
    })),
  });

  const uploadedFile = await storageAdaptorUploadFile(files);

  logger.success("FILE", "upload response ready", { uploadedFile });

  return NextResponse.json({ message: "File uploaded", src: uploadedFile });
}

const postAuthWithValidateSchemaHandler = withAuth(
  withValidate<typeof postSchemas, ApiContext>(postSchemas, postRouteHandler),
);

export const POST = withApiLogger(postAuthWithValidateSchemaHandler);

async function deleteRouteHandler(
  request: NextRequest,
  ctx: DeleteContextReturnType,
) {
  logger.info("FILE", "delete request validated", { key: ctx.body.key });

  await storageAdaptorDeleteFile(ctx.body.key);

  return NextResponse.json({ message: "File deleted" });
}

const deleteAuthWithValidateSchemaHandler = withAuth(
  withValidate<typeof deleteSchemas, ApiContext>(
    deleteSchemas,
    deleteRouteHandler,
  ),
);

export const DELETE = withApiLogger(deleteAuthWithValidateSchemaHandler);
