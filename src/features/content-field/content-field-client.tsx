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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Path } from "react-hook-form";
import { toast } from "sonner";

import { FormLanguageToggle } from "@/src/components/form/language-toggle";
import ControlledRichTextEditor from "@/src/components/form/rich-text-editor";
import { PageHeader } from "@/src/components/page-header";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Dropdown } from "@/src/components/ui/dropdown/dropdown";
import { Label } from "@/src/components/ui/label";
import { SurfaceToggle } from "@/src/components/ui/surface-toggle";
import { publishContentFieldAction } from "./content-field.actions";
import {
  getContentFieldDefinitions,
  getRequiredContentFieldVariants,
} from "./content-field.config";
import {
  contentFieldDraftStorageSchema,
  getContentFieldFormSchema,
  type ContentFieldFormValues,
} from "./content-field.schema";
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

const DRAFT_STORAGE_VERSION = 5;

function getDraftStorageKey(pageKey: ContentFieldDraft["pageKey"]) {
  return `anantara-cms:content-field:${pageKey}:draft:v${DRAFT_STORAGE_VERSION}`;
}

function contentSnapshot(data: ContentFieldData) {
  return JSON.stringify(data);
}

function getVariantContent(
  data: ContentFieldData,
  fieldKey: string,
  variant: string,
) {
  const fieldData = data[fieldKey];
  if (variant === "web:en") return fieldData?.desktop?.en;
  if (variant === "web:it") return fieldData?.desktop?.it;
  if (variant === "app:en") return fieldData?.app?.en;
  return undefined;
}

function getFirstWebLanguageGap(
  pageKey: ContentFieldDraft["pageKey"],
  data: ContentFieldData,
) {
  return getContentFieldDefinitions(pageKey).find((field) => {
    if (!field.variants.includes("web:it")) return false;

    const webEnglish = getVariantContent(data, field.key, "web:en")?.trim();
    const webItalian = getVariantContent(data, field.key, "web:it")?.trim();

    return Boolean(webEnglish) !== Boolean(webItalian);
  });
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
  const form = useForm<ContentFieldFormValues>({
    defaultValues: { data: initialDraft.data },
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver: zodResolver(getContentFieldFormSchema(initialDraft.pageKey)),
  });
  const draftData = form.watch("data");
  const [hydrated, setHydrated] = useState(false);
  const [surfaceByField, setSurfaceByField] = useState<Record<string, "app" | "desktop">>(
    () => Object.fromEntries(fields.map((field) => [field.key, field.surfaces[0] ?? "desktop"])),
  );
  const [desktopLocale, setDesktopLocale] =
    useState<ContentFieldLocale>(routeLocale);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const requiredVariants = getRequiredContentFieldVariants(
    publishedDraft.pageKey,
  );
  const hasMissingRequiredContent = requiredVariants.some(
    ({ fieldKey, variant }) =>
      !getVariantContent(draftData, fieldKey, variant)?.trim(),
  );
  const firstWebLanguageGap = getFirstWebLanguageGap(
    publishedDraft.pageKey,
    draftData,
  );
  const missingRequiredSurfaces = [...new Set(
    requiredVariants
      .filter(
        ({ fieldKey, variant }) =>
          !getVariantContent(draftData, fieldKey, variant)?.trim(),
      )
      .map(({ variant }) => (variant.startsWith("app:") ? t("app") : t("desktop"))),
  )];

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

      if (parsed.data.draft.pageKey === initialDraft.pageKey) {
        form.reset({ data: parsed.data.draft.data });
      }
    } catch {
      window.localStorage.removeItem(getDraftStorageKey(initialDraft.pageKey));
    } finally {
      setHydrated(true);
    }
  }, [form, initialDraft.pageKey, initialDraft.version]);

  useEffect(() => {
    setDesktopLocale(routeLocale);
  }, [routeLocale]);

  useEffect(() => {
    if (!hasMissingRequiredContent) setShowValidation(false);
  }, [hasMissingRequiredContent]);

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
          },
        }),
      );
    } catch {
      // The draft remains usable in memory if browser storage is unavailable.
    }
  }, [draftData, dirty, hydrated, initialDraft.pageKey, publishedDraft]);

  function discard() {
    form.reset({ data: publishedDraft.data });
    setEditorResetKey((current) => current + 1);
    toast.success(t("discardSuccess"));
  }

  async function publish() {
    try {
      const canonical = await publishContentFieldAction({
        data: form.getValues("data"),
        pageKey: publishedDraft.pageKey,
      });
      setPublishedDraft(canonical);
      form.reset({ data: canonical.data });
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

  function fixContent() {
    const incomplete = getRequiredContentFieldVariants(
      publishedDraft.pageKey,
    ).find(({ fieldKey, variant }) => {
      return !getVariantContent(form.getValues("data"), fieldKey, variant)?.trim();
    });

    if (!incomplete) return;

    const [channel, locale] = incomplete.variant.split(":") as [
      "web" | "app",
      "en",
    ];
    setSurfaceByField((current) => ({
      ...current,
      [incomplete.fieldKey]: channel === "web" ? "desktop" : "app",
    }));
    if (channel === "web") setDesktopLocale(locale);
  }

  function fixWebLanguageGap() {
    if (!firstWebLanguageGap) return;

    const webItalian = getVariantContent(
      form.getValues("data"),
      firstWebLanguageGap.key,
      "web:it",
    )?.trim();

    setSurfaceByField((current) => ({
      ...current,
      [firstWebLanguageGap.key]: "desktop",
    }));
    setDesktopLocale(webItalian ? "en" : "it");
  }

  const { openDiscardChanges, openPublishChanges } = useContentFieldModals({
    hasWebLanguageGap: Boolean(firstWebLanguageGap),
    onDiscard: discard,
    onFixContent: fixWebLanguageGap,
    onPublish: publish,
    translationNamespace,
  });

  function submitForPublish() {
    void form.handleSubmit(openPublishChanges, () => {
      setShowValidation(true);
      fixContent();
    })();
  }

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
          onClick={submitForPublish}
        >
          {t("publishChanges")}
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {fields.map((field) => {
          const surface = surfaceByField[field.key] ?? "desktop";
          const fieldData = draftData[field.key];
          const editLocale: ContentFieldLocale = surface === "app" ? "en" : desktopLocale;
          const hasApp = field.surfaces.includes("app");
          const editorName = (
            surface === "app"
              ? `data.${field.key}.app.en`
              : `data.${field.key}.desktop.${editLocale}`
          ) as Path<ContentFieldFormValues>;
          const activeVariant = surface === "app" ? "app:en" : "web:en";
          const invalid =
            showValidation &&
            (surface === "app" || editLocale === "en") &&
            requiredVariants.some(
              ({ fieldKey, variant }) =>
                fieldKey === field.key &&
                variant === activeVariant &&
                !getVariantContent(draftData, fieldKey, variant)?.trim(),
            );

          return (
            <Card key={field.key} className="rounded-2xl">
              <CardContent className="space-y-5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label>{field.label} <span className="text-destructive">*</span></Label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SurfaceToggle
                      value={surface}
                      labels={{ app: t("app"), desktop: t("desktop") }}
                      availability={{
                        app: Boolean(fieldData?.app?.en?.trim()),
                        desktop: Boolean(fieldData?.desktop?.en?.trim()),
                      }}
                      disabledSurfaces={hasApp ? [] : ["app"]}
                      disabledTitle={hasApp ? undefined : t("appUnavailable")}
                      onValueChange={(nextSurface) => setSurfaceByField((current) => ({ ...current, [field.key]: nextSurface }))}
                    />
                    <FormLanguageToggle
                      size="sm"
                      value={editLocale}
                      disabledValues={surface === "app" ? ["en", "it"] : []}
                      disabledTitle={t("appEnglishOnly")}
                      availability={{
                        en: Boolean((surface === "app" ? fieldData?.app?.en : fieldData?.desktop?.en)?.trim()),
                        it: Boolean(fieldData?.desktop?.it?.trim()),
                      }}
                      onValueChange={setDesktopLocale}
                    />
                  </div>
                </div>
                <div className="[&_.ck-editor__editable_inline]:min-h-[28rem] [&_.ck-editor__editable_inline]:px-10 [&_.ck-editor__editable_inline]:py-12">
                  <ControlledRichTextEditor
                    control={form.control}
                    invalid={invalid}
                    name={editorName}
                    key={`${field.key}-${surface}-${editLocale}-${editorResetKey}`}
                    placeholder={t(surface === "app" ? "appPlaceholder" : "desktopPlaceholder")}
                  />
                  {invalid ? (
                    <p className="text-sm text-destructive">
                      {missingRequiredSurfaces.length === 1
                        ? t("contentRequiredError", {
                            surface: missingRequiredSurfaces[0],
                          })
                        : t("contentRequiredErrors", {
                            surfaces: missingRequiredSurfaces.join(
                              ` ${t("and")} `,
                            ),
                          })}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
