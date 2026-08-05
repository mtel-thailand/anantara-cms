export const DEFAULT_ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const configuredFileTypes = process.env.S3_ACCEPTED_FILE_TYPES?.split(",")
  .map((fileType) => fileType.trim())
  .filter(Boolean);

export const ACCEPTED_FILE_TYPES: readonly string[] = configuredFileTypes?.length
  ? configuredFileTypes
  : DEFAULT_ACCEPTED_FILE_TYPES;
