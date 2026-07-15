import {
  storageAdaptorDeleteFile,
  storageAdaptorGetDownloadUrl,
  storageAdaptorGetFileMetadata,
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
import { buildStoragePrefix } from "@/src/lib/s3/key";
import {
  decodeStorageScope,
  storageScopesEqual,
} from "@/src/lib/s3/scope";

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const postSchemas = {
  query: z
    .object({
      scope: z.string().max(512).optional(),
    })
    .strict(),
  files: z
    .array(z.instanceof(File))
    .min(1, "At least 1 file is required.")
    .max(MAX_FILES, `Maximum ${MAX_FILES} files are allowed.`)
    .refine(
      (files) => files.every((file) => file.size <= MAX_FILE_SIZE),
      `Max file size is ${MAX_FILE_SIZE_MB}MB per file.`,
    ),
} satisfies SchemaMap;

type PostContextReturnType = ApiContext & InferSchemas<typeof postSchemas>;

const deleteSchemas = {
  body: z
    .object({
      key: z.string().min(1, "S3 key is required."),
      scope: z.array(z.string().min(1).max(128)).max(12).default([]),
    })
    .strict(),
} satisfies SchemaMap;

type DeleteContextReturnType = ApiContext & InferSchemas<typeof deleteSchemas>;

async function postRouteHandler(
  request: NextRequest,
  ctx: PostContextReturnType,
) {
  if (!ctx.user || !ctx.files?.length) {
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

  const uploadedFile = await storageAdaptorUploadFile(files, {
    scope: decodeStorageScope(ctx.query.scope),
    uploadedBy: ctx.user.id,
  });

  logger.success("FILE", "upload response ready", { uploadedFile });

  return NextResponse.json({ message: "File uploaded", src: uploadedFile });
}

const postAuthWithValidateSchemaHandler = withAuth(
  withValidate<typeof postSchemas, ApiContext>(postSchemas, postRouteHandler),
);

export const POST = withApiLogger(postAuthWithValidateSchemaHandler);

const getSchemas = {
  query: z
    .object({
      key: z.string().min(1, "S3 key is required.").max(1024),
    })
    .strict(),
} satisfies SchemaMap;

type GetContextReturnType = ApiContext & InferSchemas<typeof getSchemas>;

async function getRouteHandler(
  request: NextRequest,
  ctx: GetContextReturnType,
) {
  const downloadUrl = await storageAdaptorGetDownloadUrl(ctx.query.key);
  return NextResponse.redirect(downloadUrl);
}

const getAuthWithValidateSchemaHandler = withAuth(
  withValidate<typeof getSchemas, ApiContext>(
    getSchemas,
    getRouteHandler,
  ),
);

export const GET = withApiLogger(getAuthWithValidateSchemaHandler);

async function deleteRouteHandler(
  request: NextRequest,
  ctx: DeleteContextReturnType,
) {
  if (!ctx.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const scopePrefix = `${buildStoragePrefix(ctx.body.scope)}/`;
  if (!ctx.body.key.startsWith(scopePrefix)) {
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }

  const storedFile = await storageAdaptorGetFileMetadata(ctx.body.key);
  if (
    storedFile.uploadedBy !== ctx.user.id ||
    !storageScopesEqual(storedFile.scope, ctx.body.scope)
  ) {
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }

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
