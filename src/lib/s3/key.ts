import { randomUUID } from "node:crypto";

function safeKeyPart(value: string) {
  const safeValue = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!safeValue || safeValue === "." || safeValue === "..") {
    throw new Error("Invalid S3 key segment");
  }

  return safeValue;
}

export type StorageFolder = "client" | "cms";

export function normalizeStorageFolder(value: string) {
  const folder = value
    .split("/")
    .filter(Boolean)
    .map(safeKeyPart)
    .join("/");

  if (!folder) throw new Error("Invalid S3 folder");
  return folder;
}

export function buildStoragePrefix(
  scope: readonly string[] = [],
  folder: StorageFolder = "cms",
) {
  const root = normalizeStorageFolder(
    folder === "client"
      ? process.env.AWS_S3_CLIENT_FOLDER?.trim() || "client-uploads"
      : process.env.AWS_S3_CMS_FOLDER?.trim() || "cms-uploads",
  );

  return [root, ...scope.map(safeKeyPart)].join("/");
}

export const buildStorageKey = (filename: string, folder?: "client") => {
  if (folder === "client") {
    return `${buildStoragePrefix([], "client")}/${safeKeyPart(filename)}`;
  }

  return buildScopedStorageKey(filename);
};

export function buildScopedStorageKey(
  filename: string,
  scope: readonly string[] = [],
) {
  return `${buildStoragePrefix(scope)}/${randomUUID()}-${safeKeyPart(filename)}`;
}
