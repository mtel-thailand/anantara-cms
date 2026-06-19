import { FileLoader, UploadResponse } from "ckeditor5";
import { logger } from "@/src/lib/logger";

export class CkEditorUploadAdapter {
  loader: FileLoader;

  constructor(loader: FileLoader) {
    // The file loader instance to use during the upload.
    this.loader = loader;
  }

  // Starts the upload process.
  async upload(): Promise<UploadResponse> {
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
      return {
        default:
          "https://d15j1ksm9qghj4.cloudfront.net/cms-uploads/We%20Heart%20It.jpg",
      };
    } catch (error) {
      logger.error("EDITOR_UPLOAD", "upload failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        default:
          "https://d15j1ksm9qghj4.cloudfront.net/cms-uploads/We%20Heart%20It.jpg",
      };
    }
  }

  // Aborts the upload process.
  abort() {
    logger.warn("EDITOR_UPLOAD", "upload aborted");
  }
}
