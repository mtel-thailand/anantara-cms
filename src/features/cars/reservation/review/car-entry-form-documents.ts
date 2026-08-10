export type CarEntryFormDocument = {
  contentType?: string;
  key?: string;
  name: string;
  url: string;
};

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "application/msword": ".doc",
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

function text(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function fileExtension(value: string) {
  const match = value.match(/\.[a-z0-9]{1,10}$/i);
  return match?.[0].toLowerCase() ?? "";
}

function urlFileName(value: string) {
  try {
    const pathname = new URL(value, "https://local.invalid").pathname;
    return decodeURIComponent(pathname.split("/").at(-1) ?? "");
  } catch {
    return "";
  }
}

function documentName(
  document: Record<string, unknown>,
  url: string,
  index: number,
) {
  const name = text(document, "name");
  const fileName = text(document, "fileName");
  const urlName = urlFileName(url);
  const contentType = text(document, "contentType");
  const extension =
    fileExtension(name) ||
    fileExtension(fileName) ||
    fileExtension(urlName) ||
    EXTENSION_BY_CONTENT_TYPE[contentType] ||
    "";
  const baseName = name || fileName || urlName || `Document ${index + 1}`;

  return fileExtension(baseName) || !extension
    ? baseName
    : `${baseName}${extension}`;
}

export function carEntryFormDocuments(value: unknown): CarEntryFormDocument[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];

    const document = item as Record<string, unknown>;
    const publicUrl = text(document, "publicUrl");
    const storedUrl = text(document, "url");
    const explicitKey = text(document, "key");
    const url = publicUrl || storedUrl;
    if (!url) return [];
    const key =
      explicitKey ||
      (storedUrl && !/^https?:\/\//i.test(storedUrl) ? storedUrl : undefined);

    return [
      {
        contentType: text(document, "contentType") || undefined,
        key,
        name: documentName(document, url, index),
        url,
      },
    ];
  });
}

export function carEntryFormDocumentUrl(document: CarEntryFormDocument) {
  return document.key
    ? `/api/file?${new URLSearchParams({
        key: document.key,
        response: "content",
      })}`
    : document.url;
}
