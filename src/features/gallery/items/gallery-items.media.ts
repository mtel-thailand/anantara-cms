import { uploadFileWithPresignedUrl } from "@/src/lib/s3/presigned-upload-client";

const MAX_IMAGE_MB = 10;
const MAX_IMAGE_SIZE = MAX_IMAGE_MB * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpg", "image/jpeg", "image/png"]);
const galleryImageScope = ["gallery", "items"] as const;

export function hasSupportedGalleryImageType(file: File) {
  return IMAGE_TYPES.has(file.type);
}

export function hasSupportedGalleryImageSize(file: File) {
  return file.size <= MAX_IMAGE_SIZE;
}

export function isSupportedGalleryImage(file: File) {
  return (
    hasSupportedGalleryImageType(file) && hasSupportedGalleryImageSize(file)
  );
}

export async function uploadGalleryImage(file: File) {
  if (!hasSupportedGalleryImageType(file)) {
    throw new Error("Only JPG and PNG images can be uploaded.");
  }
  if (!hasSupportedGalleryImageSize(file)) {
    throw new Error(`Use a JPG or PNG up to ${MAX_IMAGE_MB}MB.`);
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
