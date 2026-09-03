"use client";

import { ContentFieldClient } from "@/src/features/content-field/content-field-client";
import type { ContentFieldDraft } from "@/src/features/content-field/content-field.types";
import { useTranslations } from "next-intl";
import { SponsorsAppContentPreview, SponsorsDesktopContentPreview } from "./components/sponsors-content-field-preview";

export function SponsorsContentFieldClient({ description, initialDraft, title }: { description: string; initialDraft: ContentFieldDraft; title: string }) {
  const t = useTranslations("sponsors.contentField");

  return <ContentFieldClient
    description={description}
    fields={[
      { contentType: "rich_text", key: "header", label: t("headerLabel"), description: t("headerDescription"), surfaces: ["desktop", "app"] },
      { contentType: "rich_text", key: "footer", label: t("bodyLabel"), description: t("bodyDescription"), surfaces: ["desktop"] },
    ]}
    initialDraft={initialDraft}
    previewData={undefined}
    previews={{ app: SponsorsAppContentPreview, desktop: SponsorsDesktopContentPreview }}
    title={title}
    translationNamespace="sponsors.contentField"
  />;
}
