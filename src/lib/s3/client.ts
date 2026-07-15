import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { buildStorageKey } from "./key";
import { logger } from "@/src/lib/logger";

const bucketName = process.env.AWS_S3_BUCKET?.trim() || "";
const region = process.env.AWS_S3_REGION?.trim() || "";
const accessKeyId = process.env.AWS_S3_ACCESS_KEY?.trim() || "";
const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY?.trim() || "";
const cmsFolder = process.env.AWS_S3_CMS_FOLDER?.trim() || "cms-uploads";
const clientFolder = process.env.AWS_S3_CLIENT_FOLDER?.trim() || "client-uploads";
const clientUrl = process.env.NEXT_PUBLIC_IMAGE_PUBLIC_BASE_URL?.trim() || "";

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

export const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export type StorageFile = {
  url: string;
  publicUrl: string;
  fileName: string;
  contentType: string;
  size: number;
  seq: number;
};

function buildPublicUrl(key: string) {
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
  folder?: "client",
): Promise<StorageFile> {
  const start = performance.now();
  const buffer = Buffer.from(await file.arrayBuffer());

  const safeName = file.name.replace(/\s+/g, "-");
  const fileKey = buildStorageKey(safeName, folder);

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
    publicUrl: buildPublicUrl(fileKey),
    fileName: file.name,
    contentType: file.type,
    size: file.size,
    seq: index + 1,
  };
}

export async function storageAdaptorUploadFile(
  file: File | File[],
  folder?: "client",
): Promise<StorageFile | StorageFile[]> {
  if (Array.isArray(file)) {
    logger.info("S3", "upload batch started", { count: file.length });
    return Promise.all(file.map((f, index) => uploadFile(f, index, folder)));
  }

  return uploadFile(file, 0, folder);
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
