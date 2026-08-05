import type { StorageFile } from "@/src/lib/s3/client";
import type { StorageScope } from "@/src/lib/s3/scope";
import { logger } from "@/src/lib/logger";

type PresignedUploadResponse = {
  headers: Record<string, string>;
  key: string;
  method: "PUT";
  publicUrl: string;
  url: string;
};

type PresignedUploadOptions = {
  scope?: StorageScope;
  sequence?: number;
  signal?: AbortSignal;
};

async function responseError(response: Response, fallback: string) {
  const responseBody = await response.text().catch(() => "");

  if (!responseBody) return fallback;

  try {
    const body = JSON.parse(responseBody) as { message?: unknown };
    if (typeof body.message === "string") return body.message;
  } catch {
    logger.warn("S3", "Failed to parse response body as JSON", {
      status: response.status,
      body: responseBody.slice(0, 2_000),
    });
  }

  return responseBody.trim().slice(0, 2_000) || fallback;
}

export async function uploadFileWithPresignedUrl(
  file: File,
  options: PresignedUploadOptions = {},
): Promise<StorageFile> {
  const key = `${crypto.randomUUID()}-${file.name}`;
  const startedAt = performance.now();
  let stage = "request-presigned-url";

  try {
    const presignedResponse = await fetch("/api/file/presigned-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        key,
        contentType: file.type,
        fileName: file.name,
        scope: options.scope ?? [],
        size: file.size,
      }),
      signal: options.signal,
    });

    if (!presignedResponse.ok) {
      throw new Error(
        await responseError(
          presignedResponse,
          `Could not create upload URL (${presignedResponse.status}).`,
        ),
      );
    }

    const upload = (await presignedResponse.json()) as PresignedUploadResponse;
    if (
      !upload.url ||
      !upload.key ||
      !upload.publicUrl ||
      upload.method !== "PUT" ||
      !upload.headers
    ) {
      throw new Error("Presigned upload API returned an invalid response.");
    }

    stage = "upload-to-s3";
    const uploadResponse = await fetch(upload.url, {
      method: upload.method,
      headers: upload.headers,
      body: file,
      signal: options.signal,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        await responseError(
          uploadResponse,
          `S3 upload failed with status ${uploadResponse.status}.`,
        ),
      );
    }

    logger.success("S3_UPLOAD", "presigned upload completed", {
      key: upload.key,
      name: file.name,
      size: file.size,
      durationMs: Math.round(performance.now() - startedAt),
    });

    return {
      url: upload.key,
      publicUrl: upload.publicUrl,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      seq: options.sequence ?? 1,
    };
  } catch (error) {
    logger.error("S3_UPLOAD", "presigned upload failed", {
      stage,
      key,
      name: file.name,
      contentType: file.type,
      size: file.size,
      scope: options.scope ?? [],
      durationMs: Math.round(performance.now() - startedAt),
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
}
