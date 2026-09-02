import { uploadFileWithPresignedUrl } from "@/src/lib/s3/presigned-upload-client";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const galleryImageScope = ["gallery", "items"] as const;

export function isSupportedGalleryImage(file: File) {
  return IMAGE_TYPES.has(file.type) && file.size <= MAX_IMAGE_SIZE;
}

export async function uploadGalleryImage(file: File) {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("Only JPG and PNG images can be uploaded.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Use a JPG or PNG up to 10MB.");
  }

  const uploaded = await uploadFileWithPresignedUrl(file, {
    scope: galleryImageScope,
  });
  return { imageKey: uploaded.url, imageUrl: uploaded.publicUrl };
}

export async function removeGalleryImage(imageKey: string) {
  const response = await fetch("/api/file", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ key: imageKey, scope: galleryImageScope }),
  });

  if (!response.ok) {
    throw new Error(`Unable to remove gallery image (${response.status}).`);
  }
}
