import { getContentFieldDefinitions } from "./content-field.config";
import type {
  ContentFieldData,
  ContentFieldDraft,
  ContentFieldEditorField,
} from "./content-field.types";

type ContentFieldType = ContentFieldEditorField["contentType"];

const MEANINGFUL_EMBED_PATTERN = /<(?:audio|iframe|img|table|video)\b/i;
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const HTML_TAG_PATTERN = /<[^>]*>/g;
const EMPTY_HTML_ENTITY_PATTERN = /(?:&nbsp;|&#0*160;|&#x0*a0;)/gi;
const INVISIBLE_CHARACTER_PATTERN = /[\s\u00a0\u200b-\u200d\ufeff]/g;

export function hasContentFieldValue(
  contentType: ContentFieldType,
  value: string | undefined,
) {
  if (!value?.trim()) return false;
  if (contentType !== "rich_text") return true;
  if (MEANINGFUL_EMBED_PATTERN.test(value)) return true;

  return Boolean(
    value
      .replace(HTML_COMMENT_PATTERN, "")
      .replace(HTML_TAG_PATTERN, "")
      .replace(EMPTY_HTML_ENTITY_PATTERN, " ")
      .replace(INVISIBLE_CHARACTER_PATTERN, ""),
  );
}

export function contentFieldSnapshot(data: ContentFieldData) {
  return JSON.stringify(data);
}

export function getContentFieldVariantValue(
  data: ContentFieldData,
  fieldKey: string,
  variant: string,
) {
  const fieldData = data[fieldKey];
  if (variant === "web:en") return fieldData?.desktop?.en;
  if (variant === "web:it") return fieldData?.desktop?.it;
  if (variant === "app:en") return fieldData?.app?.en;
  if (variant === "web:und") return fieldData?.web?.und;
  return undefined;
}

export function getFirstWebLanguageGap(
  pageKey: ContentFieldDraft["pageKey"],
  data: ContentFieldData,
) {
  return getContentFieldDefinitions(pageKey).find((field) => {
    if (!field.variants.includes("web:it")) return false;

    const webEnglish = hasContentFieldValue(
      field.contentType,
      getContentFieldVariantValue(data, field.key, "web:en"),
    );
    const webItalian = hasContentFieldValue(
      field.contentType,
      getContentFieldVariantValue(data, field.key, "web:it"),
    );

    return webEnglish !== webItalian;
  });
}
