import { uploadFileWithPresignedUrl } from "@/src/lib/s3/presigned-upload-client";

const MAX_PORTRAIT_SIZE = 10 * 1024 * 1024;
const PORTRAIT_TYPES = new Set(["image/jpeg", "image/png"]);
const portraitScope = ["awards", "special-awards", "portraits"] as const;

export async function uploadSpecialAwardPortrait(
  file: File,
  signal?: AbortSignal,
) {
  if (!PORTRAIT_TYPES.has(file.type) || file.size > MAX_PORTRAIT_SIZE) {
    throw new Error("Use a JPG or PNG up to 10MB.");
  }
  const uploaded = await uploadFileWithPresignedUrl(file, {
    scope: portraitScope,
    signal,
  });
  return { key: uploaded.url, publicUrl: uploaded.publicUrl };
}

export async function removeSpecialAwardPortrait(key: string) {
  const response = await fetch("/api/file", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ key, scope: portraitScope }),
  });

  if (!response.ok) {
    throw new Error(`Unable to remove uploaded portrait (${response.status}).`);
  }
}
