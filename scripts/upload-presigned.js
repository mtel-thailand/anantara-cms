const CONTENT_TYPES = {
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".webp": "image/webp",
};

function safeFileName(filePath, basename) {
  return basename(filePath)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function readResponse(response) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}${text ? `: ${text}` : ""}`,
    );
  }

  return text ? JSON.parse(text) : null;
}

async function main() {
  const [{ randomUUID }, { readFile }, { basename, extname }] =
    await Promise.all([
      import("node:crypto"),
      import("node:fs/promises"),
      import("node:path"),
    ]);
  const [filePath, requestedKey] = process.argv.slice(2);

  if (!filePath) {
    throw new Error(
      "Usage: yarn upload:presigned <file-path> [client-upload-key]",
    );
  }

  const file = await readFile(filePath);
  const extension = extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[extension];

  if (!contentType) {
    throw new Error(`Unsupported file extension: ${extension || "none"}`);
  }

  const apiBaseUrl =
    process.env.UPLOAD_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const clientFolder = process.env.S3_CLIENT_FOLDER?.trim() || "client-uploads";
  const key =
    requestedKey ||
    `${clientFolder}/${randomUUID()}-${safeFileName(filePath, basename)}`;

  const presignedResponse = await fetch(
    `${apiBaseUrl}/api/public/upload/presigned`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        contentType,
        size: file.byteLength,
      }),
    },
  );
  console.log("file", file.byteLength, contentType);
  const upload = await readResponse(presignedResponse);
  console.log("upload", upload);
  const uploadResponse = await fetch(upload.url, {
    method: upload.method,
    headers: upload.headers,
    body: file,
  });

  await readResponse(uploadResponse);
  process.stdout.write(`Uploaded ${file.byteLength} bytes to ${upload.key}\n`);
}

main().catch((error) => {
  process.stderr.write(
    `Upload failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
