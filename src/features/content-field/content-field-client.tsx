"use client";

import {
  ChevronDown,
  Eye,
  Monitor,
  RotateCcw,
  Smartphone,
  Upload,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { toast } from "sonner";

import { FormLanguageToggle } from "@/src/components/form/language-toggle";
import { PageHeader } from "@/src/components/page-header";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Dropdown } from "@/src/components/ui/dropdown/dropdown";
import ClientSideCustomEditor from "@/src/components/ui/editor/client-side-custom-editor";
import { Label } from "@/src/components/ui/label";
import { SurfaceToggle } from "@/src/components/ui/surface-toggle";
import { publishContentFieldAction } from "./content-field.actions";
import { contentFieldDraftStorageSchema } from "./content-field.schema";
import { useContentFieldModals } from "./hooks/use-content-field-modals";
import { useContentPreviewModal } from "./hooks/use-content-preview-modal";
import type {
  ContentFieldData,
  ContentFieldDraft,
  ContentFieldEditorField,
  ContentFieldLocale,
  ContentFieldPreviewProps,
  ContentFieldTranslationNamespace,
} from "./content-field.types";

const DRAFT_STORAGE_VERSION = 3;

function getDraftStorageKey(pageKey: ContentFieldDraft["pageKey"]) {
  return `anantara-cms:content-field:${pageKey}:draft:v${DRAFT_STORAGE_VERSION}`;
}

function contentSnapshot(data: ContentFieldData) {
  return JSON.stringify(data);
}

export function ContentFieldClient<PreviewData>({
  description,
  initialDraft,
  fields,
  previewData,
  previews,
  title,
  translationNamespace,
}: {
  description: string;
  initialDraft: ContentFieldDraft;
  fields: readonly ContentFieldEditorField[];
  previewData: PreviewData;
  previews: Record<
    "app" | "desktop",
    ComponentType<ContentFieldPreviewProps<PreviewData>>
  >;
  title: string;
  translationNamespace: ContentFieldTranslationNamespace;
}) {
  const t = useTranslations(translationNamespace);
  const { openPreview } = useContentPreviewModal<PreviewData>();
  const routeLocale = useLocale() as ContentFieldLocale;
  const [publishedDraft, setPublishedDraft] =
    useState<ContentFieldDraft>(initialDraft);
  const [draftData, setDraftData] = useState<ContentFieldData>(
    initialDraft.data,
  );
  const [hydrated, setHydrated] = useState(false);
  const [surfaceByField, setSurfaceByField] = useState<Record<string, "app" | "desktop">>(
    () => Object.fromEntries(fields.map((field) => [field.key, field.surfaces[0] ?? "desktop"])),
  );
  const [desktopLocale, setDesktopLocale] =
    useState<ContentFieldLocale>(routeLocale);
  const [editorResetKey, setEditorResetKey] = useState(0);

  const dirty =
    contentSnapshot(draftData) !== contentSnapshot(publishedDraft.data);

  useEffect(() => {
    try {
      const storageKey = getDraftStorageKey(initialDraft.pageKey);
      const rawDraft = window.localStorage.getItem(storageKey);
      if (!rawDraft) return;

      const parsed = contentFieldDraftStorageSchema.safeParse(
        JSON.parse(rawDraft),
      );
      if (!parsed.success) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      if (
        parsed.data.draft.pageKey === initialDraft.pageKey &&
        parsed.data.draft.version === initialDraft.version
      ) {
        setDraftData(parsed.data.draft.data);
      }
    } catch {
      window.localStorage.removeItem(getDraftStorageKey(initialDraft.pageKey));
    } finally {
      setHydrated(true);
    }
  }, [initialDraft.pageKey, initialDraft.version]);

  useEffect(() => {
    setDesktopLocale(routeLocale);
  }, [routeLocale]);

  useEffect(() => {
    if (!hydrated) return;

    if (!dirty) {
      window.localStorage.removeItem(getDraftStorageKey(initialDraft.pageKey));
      return;
    }

    try {
      window.localStorage.setItem(
        getDraftStorageKey(initialDraft.pageKey),
        JSON.stringify({
          version: DRAFT_STORAGE_VERSION,
          draft: {
            data: draftData,
            pageKey: publishedDraft.pageKey,
            version: publishedDraft.version,
          },
        }),
      );
    } catch {
      // The draft remains usable in memory if browser storage is unavailable.
    }
  }, [draftData, dirty, hydrated, initialDraft.pageKey, publishedDraft]);

  function updateContent(
    fieldKey: string,
    surface: "app" | "desktop",
    locale: ContentFieldLocale,
    content: string,
  ) {
    setDraftData((current) => {
      const fieldData = current[fieldKey] ?? {};

      return surface === "app"
        ? { ...current, [fieldKey]: { ...fieldData, app: { en: content } } }
        : {
            ...current,
            [fieldKey]: {
              ...fieldData,
              desktop: {
                en: locale === "en" ? content : (fieldData.desktop?.en ?? ""),
                it: locale === "it" ? content : (fieldData.desktop?.it ?? ""),
              },
            },
          };
    });
  }

  function discard() {
    setDraftData(publishedDraft.data);
    setEditorResetKey((current) => current + 1);
    toast.success(t("discardSuccess"));
  }

  async function publish() {
    try {
      const canonical = await publishContentFieldAction({
        data: draftData,
        pageKey: publishedDraft.pageKey,
        version: publishedDraft.version,
      });
      setPublishedDraft(canonical);
      setDraftData(canonical.data);
      toast.success(t("publishSuccess"), {
        description: t("publishDescription"),
      });
      return true;
    } catch (error) {
      toast.error(t("publishError"), {
        description:
          error instanceof Error ? error.message : t("publishErrorDescription"),
      });
      return false;
    }
  }

  const { openDiscardChanges, openPublishChanges } = useContentFieldModals({
    onDiscard: discard,
    onPublish: publish,
    translationNamespace,
  });

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        viewport={["desktop", "mobile"]}
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
                  previewData,
                  surface: "desktop" as const,
                };

                window.requestAnimationFrame(() => {
                  openPreview(preview);
                });
              },
              value: "desktop",
            },
            {
              className: "whitespace-nowrap",
              icon: <Smartphone />,
              label: t("previewApp"),
              onSelect: () => {
                const preview = {
                  Component: previews.app,
                  content: draftData,
                  locale: "en" as const,
                  previewData,
                  surface: "app" as const,
                };

                window.requestAnimationFrame(() => {
                  openPreview(preview);
                });
              },
              value: "app",
            },
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
          onClick={openDiscardChanges}
        >
          {t("discardChanges")}
        </Button>
        <Button
          leftIcon={Upload}
          disabled={!dirty}
          onClick={openPublishChanges}
        >
          {t("publishChanges")}
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {fields.map((field) => {
          const surface = surfaceByField[field.key] ?? "desktop";
          const fieldData = draftData[field.key];
          const editLocale: ContentFieldLocale = surface === "app" ? "en" : desktopLocale;
          const activeContent = surface === "app"
            ? fieldData?.app?.en ?? ""
            : fieldData?.desktop?.[editLocale] ?? "";
          const hasApp = field.surfaces.includes("app");

          return (
            <Card key={field.key} className="rounded-2xl">
              <CardContent className="space-y-5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label>{field.label} <span className="text-destructive">*</span></Label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {hasApp ? (
                      <SurfaceToggle
                        value={surface}
                        labels={{ app: t("app"), desktop: t("desktop") }}
                        availability={{
                          app: Boolean(fieldData?.app?.en.trim()),
                          desktop: Boolean(fieldData?.desktop?.en.trim()),
                        }}
                        onValueChange={(nextSurface) => setSurfaceByField((current) => ({ ...current, [field.key]: nextSurface }))}
                      />
                    ) : null}
                    <FormLanguageToggle
                      size="sm"
                      value={editLocale}
                      disabledValues={surface === "app" ? ["en", "it"] : []}
                      disabledTitle={t("appEnglishOnly")}
                      availability={{
                        en: Boolean((surface === "app" ? fieldData?.app?.en : fieldData?.desktop?.en)?.trim()),
                        it: surface === "desktop" && Boolean(fieldData?.desktop?.it.trim()),
                      }}
                      onValueChange={setDesktopLocale}
                    />
                  </div>
                </div>
                <div className="[&_.ck-editor__editable_inline]:min-h-[28rem] [&_.ck-editor__editable_inline]:px-10 [&_.ck-editor__editable_inline]:py-12">
                  <ClientSideCustomEditor
                    key={`${field.key}-${surface}-${editLocale}-${editorResetKey}`}
                    data={activeContent}
                    placeholder={t(surface === "app" ? "appPlaceholder" : "desktopPlaceholder")}
                    onChange={(content) => updateContent(field.key, surface, editLocale, content)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
