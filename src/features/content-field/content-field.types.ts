export type ContentFieldLocale = "en" | "it";
export type ContentFieldSurface = "app" | "desktop";

export type ContentFieldPreviewProps<PreviewData = undefined> = {
  content: ContentFieldData;
  locale: ContentFieldLocale;
  onClose: () => void;
  previewData: PreviewData;
  surface: ContentFieldSurface;
};

export type ContentFieldPreviewModalLayout = {
  className: string;
  contentClassName: string;
};

export type ContentFieldTranslationNamespace =
  | "cars.contentField"
  | "judges.contentField"
  | "sponsors.contentField"
  | "awards.bestInClass"
  | "awards.bestOfShow"
  | "awards.specialAwards"
  | "gallery.contentField";

export const CONTENT_FIELD_PAGE_KEYS = [
  "cars.classes",
  "judges",
  "sponsors",
  "awards.best_in_class",
  "awards.best_of_show",
  "awards.special_awards",
  "gallery",
] as const;

export type ContentFieldPageKey = (typeof CONTENT_FIELD_PAGE_KEYS)[number];

export type ContentFieldFieldData = {
  app?: { en: string };
  desktop?: Record<ContentFieldLocale, string>;
  shared?: { und: string };
  web?: { und: string };
};

export type ContentFieldData = Record<string, ContentFieldFieldData>;

export type ContentFieldEditorField = {
  contentType: "email" | "plain_text" | "rich_text";
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
