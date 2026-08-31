export type ContentFieldLocale = "en" | "it";
export type ContentFieldSurface = "app" | "desktop";

export type ContentFieldPreviewProps<PreviewData = undefined> = {
  content: ContentFieldData;
  locale: ContentFieldLocale;
  onClose: () => void;
  previewData: PreviewData;
  surface: ContentFieldSurface;
};

export type ContentFieldTranslationNamespace =
  | "cars.contentField"
  | "judges.contentField"
  | "sponsors.contentField";

export const CONTENT_FIELD_PAGE_KEYS = [
  "cars.classes",
  "judges",
  "sponsors",
] as const;

export type ContentFieldPageKey = (typeof CONTENT_FIELD_PAGE_KEYS)[number];

export type ContentFieldFieldData = {
  app?: { en: string };
  desktop?: Record<ContentFieldLocale, string>;
};

export type ContentFieldData = Record<string, ContentFieldFieldData>;

export type ContentFieldEditorField = {
  description: string;
  key: string;
  label: string;
  surfaces: readonly ContentFieldSurface[];
};

export type ContentFieldDraft = {
  data: ContentFieldData;
  pageKey: ContentFieldPageKey;
  version: number;
};
