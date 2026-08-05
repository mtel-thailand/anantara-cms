import type { StorageFile } from "@/src/lib/s3/client";
import type { StorageScope } from "@/src/lib/s3/scope";

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
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  return typeof body?.message === "string" ? body.message : fallback;
}

export async function uploadFileWithPresignedUrl(
  file: File,
  options: PresignedUploadOptions = {},
): Promise<StorageFile> {
  const key = `${crypto.randomUUID()}-${file.name}`;
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

  const uploadResponse = await fetch(upload.url, {
    method: upload.method,
    headers: upload.headers,
    body: file,
    signal: options.signal,
  });

  if (!uploadResponse.ok) {
    throw new Error(`S3 upload failed with status ${uploadResponse.status}.`);
  }

  return {
    url: upload.key,
    publicUrl: upload.publicUrl,
    fileName: file.name,
    contentType: file.type,
    size: file.size,
    seq: options.sequence ?? 1,
  };
}
