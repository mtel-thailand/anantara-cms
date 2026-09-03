"use client";

import { useTranslations } from "next-intl";

import { ContentFieldClient } from "@/src/features/content-field/content-field-client";
import type { ContentFieldDraft } from "@/src/features/content-field/content-field.types";
import type { GalleryItemsData } from "@/src/features/gallery/gallery.types";
import { GalleryContentFieldPreview } from "./components/gallery-content-field-preview";

export function GalleryContentFieldClient({
  description,
  initialDraft,
  initialGalleryItems,
  title,
}: {
  description: string;
  initialDraft: ContentFieldDraft;
  initialGalleryItems: GalleryItemsData;
  title: string;
}) {
  const t = useTranslations("gallery.contentField");

  return (
    <ContentFieldClient
      description={description}
      fields={[
        {
          contentType: "email",
          key: "contact_email",
          label: t("contactEmailLabel"),
          description: t("contactEmailDescription"),
          surfaces: ["desktop"],
        },
        {
          contentType: "rich_text",
          key: "header",
          label: t("contentEditor"),
          description: t("contentEditorDescription"),
          surfaces: ["desktop"],
        },
      ]}
      initialDraft={initialDraft}
      previewData={initialGalleryItems}
      previewLayouts={{
        desktop: {
          className:
            "flex h-[90vh] w-[90vw] max-w-7xl overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl sm:max-w-7xl",
          contentClassName: "min-h-0 flex-1 overflow-y-auto",
        },
      }}
      previews={{ desktop: GalleryContentFieldPreview }}
      title={title}
      translationNamespace="gallery.contentField"
    />
  );
}
