import { FileLoader, UploadResponse } from "ckeditor5";
import { logger } from "@/src/lib/logger";
import { eventEmitter } from "@/src/lib/events";

const IMAGE_PUBLIC_BASE_URL = "https://d15j1ksm9qghj4.cloudfront.net/";

export function getS3KeyFromImageUrl(src: string) {
  try {
    const url = new URL(src);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return src.replace(IMAGE_PUBLIC_BASE_URL, "");
  }
}

export async function deleteEditorUploadedFile(key: string, reason: string) {
  const response = await fetch("/api/file", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ key }),
  });

  if (!response.ok) {
    throw new Error(`Delete failed with status ${response.status}`);
  }

  logger.success("EDITOR_UPLOAD", "uploaded image removed from S3", {
    key,
    reason,
  });
}

export class CkEditorUploadAdapter {
  loader: FileLoader;
  private uploadedKey: string | null = null;
  private abortRequested = false;
  private uploadPromise: Promise<UploadResponse> | null = null;

  constructor(loader: FileLoader) {
    // The file loader instance to use during the upload.
    this.loader = loader;
  }

  // Starts the upload process.
  async upload(): Promise<UploadResponse> {
    this.uploadPromise = this.uploadFile();
    return this.uploadPromise;
  }

  private async uploadFile(): Promise<UploadResponse> {
    try {
      const file = await this.loader.file;
      if (!file) throw new Error("File not found");

      const ext = file.name.split(".").pop();
      const name = new Date().getTime().toString() + "." + ext;
      const type = file.type;
      logger.info("EDITOR_UPLOAD", "upload prepared", {
        ext,
        name,
        type,
        size: file.size,
      });

      const formData = new FormData();
      formData.append("files", file);

      const response = await fetch("/api/file", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const result = (await response.json()) as {
        src?: Array<{ url: string; publicUrl?: string }>;
      };
      const uploadedFile = result.src?.[0];

      if (!uploadedFile?.url) {
        throw new Error("Upload response did not include an S3 key");
      }

      this.uploadedKey = uploadedFile.url;

      if (this.abortRequested) {
        await this.deleteUploadedFile();
        throw new Error("Upload aborted");
      }

      logger.success("EDITOR_UPLOAD", "upload completed", {
        key: uploadedFile.url,
      });

      const url = `${IMAGE_PUBLIC_BASE_URL}${uploadedFile.url}`;
      eventEmitter.emit("image-uploaded", url);
      return {
        default: url,
      };
    } catch (error) {
      logger.error("EDITOR_UPLOAD", "upload failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async deleteUploadedFile() {
    if (!this.uploadedKey) {
      logger.warn("EDITOR_UPLOAD", "delete skipped because no S3 key is known");
      return;
    }

    const key = this.uploadedKey;
    this.uploadedKey = null;

    await deleteEditorUploadedFile(key, "upload-abort");
  }

  // Aborts the upload process.
  abort() {
    this.abortRequested = true;
    logger.warn("EDITOR_UPLOAD", "upload aborted");

    if (this.uploadedKey) {
      void this.deleteUploadedFile().catch((error) => {
        logger.error("EDITOR_UPLOAD", "failed to remove aborted upload", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
      return;
    }

    void this.uploadPromise?.catch(() => {
      // The upload promise logs its own failure.
    });
  }
}
