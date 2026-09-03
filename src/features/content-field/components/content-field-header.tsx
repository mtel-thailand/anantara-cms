"use client";

import {
  ChevronDown,
  Eye,
  Monitor,
  RotateCcw,
  Smartphone,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

import { PageHeader } from "@/src/components/page-header";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Dropdown } from "@/src/components/ui/dropdown/dropdown";
import type {
  ContentFieldData,
  ContentFieldLocale,
  ContentFieldPreviewModalLayout,
  ContentFieldPreviewProps,
  ContentFieldSurface,
  ContentFieldTranslationNamespace,
} from "../content-field.types";

type OpenPreview<PreviewData> = (preview: {
  Component: ComponentType<ContentFieldPreviewProps<PreviewData>>;
  content: ContentFieldData;
  locale: ContentFieldLocale;
  modalLayout?: ContentFieldPreviewModalLayout;
  previewData: PreviewData;
  surface: "app" | "desktop";
}) => void;

export function ContentFieldHeader<PreviewData>({
  description,
  desktopLocale,
  dirty,
  draftData,
  hasAppContent,
  onDiscard,
  onSubmit,
  openPreview,
  previewData,
  previewLayouts,
  previews,
  title,
  translationNamespace,
}: {
  description: string;
  desktopLocale: ContentFieldLocale;
  dirty: boolean;
  draftData: ContentFieldData;
  hasAppContent: boolean;
  onDiscard: () => void;
  onSubmit: () => void;
  openPreview: OpenPreview<PreviewData>;
  previewData: PreviewData;
  previewLayouts?: Partial<
    Record<ContentFieldSurface, ContentFieldPreviewModalLayout>
  >;
  previews: {
    app?: ComponentType<ContentFieldPreviewProps<PreviewData>>;
    desktop: ComponentType<ContentFieldPreviewProps<PreviewData>>;
  };
  title: string;
  translationNamespace: ContentFieldTranslationNamespace;
}) {
  const t = useTranslations(translationNamespace);

  return (
    <PageHeader
      title={title}
      description={description}
      viewport={hasAppContent ? ["desktop", "mobile"] : ["desktop"]}
      titleAccessory={
        dirty ? (
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary"
          >
            {t("unpublishedChanges")}
          </Badge>
        ) : null
      }
    >
      <Dropdown
        showSelectedIndicator={false}
        options={[
          {
            className: "whitespace-nowrap",
            icon: <Monitor />,
            label: t("previewDesktop"),
            onSelect: () => {
              const preview = {
                Component: previews.desktop,
                content: draftData,
                locale: desktopLocale,
                modalLayout: previewLayouts?.desktop,
                previewData,
                surface: "desktop" as const,
              };

              window.requestAnimationFrame(() => {
                openPreview(preview);
              });
            },
            value: "desktop",
          },
          ...(previews.app
            ? [
                {
                  className: "whitespace-nowrap",
                  icon: <Smartphone />,
                  label: t("previewApp"),
                  onSelect: () => {
                    const preview = {
                      Component: previews.app!,
                      content: draftData,
                      locale: "en" as const,
                      modalLayout: previewLayouts?.app,
                      previewData,
                      surface: "app" as const,
                    };

                    window.requestAnimationFrame(() => {
                      openPreview(preview);
                    });
                  },
                  value: "app",
                },
              ]
            : []),
        ]}
        trigger={
          <Button variant="outline" leftIcon={Eye} rightIcon={ChevronDown}>
            {t("preview")}
          </Button>
        }
      />
      <Button
        variant="outline"
        leftIcon={RotateCcw}
        disabled={!dirty}
        onClick={onDiscard}
      >
        {t("discardChanges")}
      </Button>
      <Button leftIcon={Upload} disabled={!dirty} onClick={onSubmit}>
        {t("publishChanges")}
      </Button>
    </PageHeader>
  );
}
