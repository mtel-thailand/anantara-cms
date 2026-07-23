import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { buildScopedStorageKey, buildStorageKey } from "./key";
import { logger } from "@/src/lib/logger";

const bucketName = process.env.S3_BUCKET?.trim() || "";
const region = process.env.S3_REGION?.trim() || "";
const accessKeyId = process.env.S3_ACCESS_KEY?.trim() || "";
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim() || "";
const credentials =
  accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
const cmsFolder = process.env.S3_CMS_FOLDER?.trim() || "cms-uploads";
const clientFolder = process.env.S3_CLIENT_FOLDER?.trim() || "client-uploads";
const clientUrl = process.env.NEXT_PUBLIC_IMAGE_PUBLIC_BASE_URL?.trim() || "";

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

export const s3Client = new S3Client({
  region,
  credentials,
});

export type StorageFile = {
  url: string;
  publicUrl: string;
  fileName: string;
  contentType: string;
  size: number;
  seq: number;
};

type StorageUploadOptions = {
  folder?: "client";
  scope?: readonly string[];
  uploadedBy?: string;
};

export function buildStoragePublicUrl(key: string) {
  const publicBaseUrl = clientUrl;

  if (publicBaseUrl) {
    return new URL(key, publicBaseUrl).toString();
  }

  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}

function assertDeletableKey(key: string) {
  const allowedFolders = [cmsFolder, clientFolder];

  if (!key || key.includes("..") || key.startsWith("/")) {
    throw new Error("Invalid S3 key");
  }

  if (
    !allowedFolders
      .filter(Boolean)
      .some((folder) => key.startsWith(`${folder}/`))
  ) {
    throw new Error("S3 key is outside the allowed upload folders");
  }
}

async function uploadFile(
  file: File,
  index: number,
  options: StorageUploadOptions = {},
  key?: string,
): Promise<StorageFile> {
  const start = performance.now();
  const buffer = Buffer.from(await file.arrayBuffer());

  const safeName = file.name.replace(/\s+/g, "-");
  const fileKey =
    key ??
    (options.folder === "client"
      ? buildStorageKey(safeName, "client")
      : buildScopedStorageKey(safeName, options.scope));

  logger.info("S3", "upload started", {
    bucket: bucketName || "missing",
    region: region || "missing",
    key: fileKey,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: formatBytes(file.size),
    sequence: index + 1,
  });

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
        ContentDisposition: "inline",
        Metadata: {
          originalfilename: encodeURIComponent(file.name),
          uploadscope: encodeURIComponent(JSON.stringify(options.scope ?? [])),
          ...(options.uploadedBy
            ? { uploadedby: encodeURIComponent(options.uploadedBy) }
            : {}),
        },
      }),
    );
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);

    logger.error("S3", "upload failed", {
      key: fileKey,
      duration: `${durationMs}ms`,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }

  const durationMs = Math.round(performance.now() - start);

  logger.success("S3", "upload completed", {
    key: fileKey,
    name: file.name,
    size: formatBytes(file.size),
    duration: `${durationMs}ms`,
  });

  return {
    url: fileKey,
    publicUrl: buildStoragePublicUrl(fileKey),
    fileName: file.name,
    contentType: file.type,
    size: file.size,
    seq: index + 1,
  };
}

export async function storageAdaptorUploadFile(
  file: File | File[],
  options: StorageUploadOptions = {},
): Promise<StorageFile | StorageFile[]> {
  if (Array.isArray(file)) {
    logger.info("S3", "upload batch started", { count: file.length });
    const results = await Promise.allSettled(
      file.map((item, index) => uploadFile(item, index, options)),
    );
    const uploaded = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const failed = results.find((result) => result.status === "rejected");

    if (failed) {
      await Promise.allSettled(
        uploaded.map((item) => storageAdaptorDeleteFile(item.url)),
      );
      throw failed.reason;
    }

    return uploaded;
  }

  return uploadFile(file, 0, options);
}

export type StoredFileMetadata = {
  contentType: string;
  fileName: string;
  scope: string[];
  size: number;
  uploadedBy?: string;
};

export async function storageAdaptorGetFileMetadata(
  key: string,
): Promise<StoredFileMetadata> {
  assertDeletableKey(key);
  const response = await s3Client.send(
    new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
  const encodedFileName = response.Metadata?.originalfilename;
  const encodedScope = response.Metadata?.uploadscope;
  const encodedUploadedBy = response.Metadata?.uploadedby;

  if (response.ContentLength === undefined || !response.ContentType) {
    throw new Error("Uploaded file metadata is incomplete.");
  }

  const parsedScope: unknown = encodedScope
    ? JSON.parse(decodeURIComponent(encodedScope))
    : [];
  if (
    !Array.isArray(parsedScope) ||
    !parsedScope.every((segment) => typeof segment === "string")
  ) {
    throw new Error("Uploaded file scope is invalid.");
  }

  return {
    contentType: response.ContentType,
    fileName: encodedFileName
      ? decodeURIComponent(encodedFileName)
      : key.split("/").at(-1) || "file",
    scope: parsedScope,
    size: response.ContentLength,
    uploadedBy: encodedUploadedBy
      ? decodeURIComponent(encodedUploadedBy)
      : undefined,
  };
}

export async function storageAdaptorGetDownloadUrl(key: string) {
  const metadata = await storageAdaptorGetFileMetadata(key);
  const fallbackFileName = metadata.fileName
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  const encodedFileName = encodeURIComponent(metadata.fileName).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  const contentDisposition = [
    `attachment; filename="${fallbackFileName || "download"}"`,
    `filename*=UTF-8''${encodedFileName}`,
  ].join("; ");

  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ResponseContentDisposition: contentDisposition,
      ResponseContentType: metadata.contentType,
    }),
    { expiresIn: 60 },
  );
}

export async function storageAdaptorGetFile(key: string) {
  const metadata = await storageAdaptorGetFileMetadata(key);
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error("Uploaded file has no content.");
  }

  return {
    body: await response.Body.transformToByteArray(),
    metadata,
  };
}

export async function storageAdaptorDeleteFile(key: string) {
  const start = performance.now();
  assertDeletableKey(key);

  logger.info("S3", "delete started", {
    bucket: bucketName || "missing",
    region: region || "missing",
    key,
  });

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);

    logger.error("S3", "delete failed", {
      key,
      duration: `${durationMs}ms`,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }

  const durationMs = Math.round(performance.now() - start);

  logger.success("S3", "delete completed", {
    key,
    duration: `${durationMs}ms`,
  });
}
