"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { ComponentType } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Path } from "react-hook-form";
import { toast } from "sonner";

import { publishContentFieldAction } from "./content-field.actions";
import { ContentEmailField } from "./components/content-email-field";
import { ContentFieldHeader } from "./components/content-field-header";
import { ContentRichTextField } from "./components/content-rich-text-field";
import {
  getContentFieldDefinitions,
  getRequiredContentFieldVariants,
} from "./content-field.config";
import {
  getContentFieldFormSchema,
  type ContentFieldFormValues,
} from "./content-field.schema";
import {
  contentFieldSnapshot,
  getContentFieldVariantValue,
  getFirstWebLanguageGap,
  hasContentFieldValue,
} from "./content-field.helpers";
import { useContentFieldDraftStorage } from "./hooks/use-content-field-draft-storage";
import { useContentFieldModals } from "./hooks/use-content-field-modals";
import { useContentPreviewModal } from "./hooks/use-content-preview-modal";
import type {
  ContentFieldDraft,
  ContentFieldEditorField,
  ContentFieldLocale,
  ContentFieldPreviewModalLayout,
  ContentFieldPreviewProps,
  ContentFieldSurface,
  ContentFieldTranslationNamespace,
} from "./content-field.types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContentFieldClient<PreviewData>({
  description,
  initialDraft,
  fields,
  previewData,
  previewLayouts,
  previews,
  title,
  translationNamespace,
}: {
  description: string;
  initialDraft: ContentFieldDraft;
  fields: readonly ContentFieldEditorField[];
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
  const [surfaceByField, setSurfaceByField] = useState<
    Record<string, "app" | "desktop">
  >(() =>
    Object.fromEntries(
      fields.map((field) => [field.key, field.surfaces[0] ?? "desktop"]),
    ),
  );
  const [desktopLocale, setDesktopLocale] =
    useState<ContentFieldLocale>(routeLocale);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const requiredVariants = getRequiredContentFieldVariants(
    publishedDraft.pageKey,
  );
  const definitions = getContentFieldDefinitions(publishedDraft.pageKey);
  const hasVariantContent = (fieldKey: string, variant: string) => {
    const definition = definitions.find((field) => field.key === fieldKey);
    return Boolean(
      definition &&
      hasContentFieldValue(
        definition.contentType,
        getContentFieldVariantValue(draftData, fieldKey, variant),
      ),
    );
  };
  const hasMissingRequiredContent = requiredVariants.some(
    ({ fieldKey, variant }) => !hasVariantContent(fieldKey, variant),
  );
  const firstWebLanguageGap = getFirstWebLanguageGap(
    publishedDraft.pageKey,
    draftData,
  );
  const missingRequiredSurfaces = [
    ...new Set(
      requiredVariants
        .filter(
          ({ fieldKey, variant }) => !hasVariantContent(fieldKey, variant),
        )
        .map(({ variant }) =>
          variant.startsWith("app:") ? t("app") : t("desktop"),
        ),
    ),
  ];

  const dirty =
    contentFieldSnapshot(draftData) !==
    contentFieldSnapshot(publishedDraft.data);
  const hasAppContent = fields.some((field) => field.surfaces.includes("app"));
  const remountEditors = useCallback(() => {
    setEditorResetKey((current) => current + 1);
  }, []);

  useContentFieldDraftStorage({
    draftData,
    form,
    initialDraft,
    onDraftLoaded: remountEditors,
    publishedDraft,
  });

  useEffect(() => {
    setDesktopLocale(routeLocale);
  }, [routeLocale]);

  useEffect(() => {
    if (!hasMissingRequiredContent) setShowValidation(false);
  }, [hasMissingRequiredContent]);

  function discard() {
    form.reset({ data: publishedDraft.data });
    remountEditors();
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
      const definition = getContentFieldDefinitions(
        publishedDraft.pageKey,
      ).find((field) => field.key === fieldKey);
      return !(
        definition &&
        hasContentFieldValue(
          definition.contentType,
          getContentFieldVariantValue(
            form.getValues("data"),
            fieldKey,
            variant,
          ),
        )
      );
    });

    if (!incomplete) return;

    const [channel, locale] = incomplete.variant.split(":") as [
      "web" | "app",
      "en" | "it" | "und",
    ];
    setSurfaceByField((current) => ({
      ...current,
      [incomplete.fieldKey]: channel === "web" ? "desktop" : "app",
    }));
    if (channel === "web" && locale !== "und") setDesktopLocale(locale);
  }

  function fixWebLanguageGap() {
    if (!firstWebLanguageGap) return;

    const webItalian = hasContentFieldValue(
      firstWebLanguageGap.contentType,
      getContentFieldVariantValue(
        form.getValues("data"),
        firstWebLanguageGap.key,
        "web:it",
      ),
    );

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
      <ContentFieldHeader
        title={title}
        description={description}
        desktopLocale={desktopLocale}
        dirty={dirty}
        draftData={draftData}
        hasAppContent={hasAppContent}
        onDiscard={openDiscardChanges}
        onSubmit={submitForPublish}
        openPreview={openPreview}
        previewData={previewData}
        previewLayouts={previewLayouts}
        previews={previews}
        translationNamespace={translationNamespace}
      />

      <div className="space-y-6">
        {fields.map((field) => {
          const surface = surfaceByField[field.key] ?? "desktop";
          const fieldData = draftData[field.key];
          const isEmail = field.contentType === "email";
          const editLocale: ContentFieldLocale =
            surface === "app" ? "en" : desktopLocale;
          const hasApp = field.surfaces.includes("app");
          const editorName = (
            surface === "app"
              ? `data.${field.key}.app.en`
              : `data.${field.key}.desktop.${editLocale}`
          ) as Path<ContentFieldFormValues>;
          const activeVariant = isEmail
            ? "web:und"
            : surface === "app"
              ? "app:en"
              : `web:${editLocale}`;
          const invalid =
            showValidation &&
            (isEmail
              ? !EMAIL_PATTERN.test(fieldData?.web?.und?.trim() ?? "")
              : requiredVariants.some(
                  ({ fieldKey, variant }) =>
                    fieldKey === field.key &&
                    variant === activeVariant &&
                    !hasVariantContent(fieldKey, variant),
                ));

          if (isEmail) {
            return (
              <ContentEmailField
                key={field.key}
                control={form.control}
                field={field}
                fieldData={fieldData}
                invalid={invalid}
                translationNamespace={translationNamespace}
              />
            );
          }

          return (
            <ContentRichTextField
              key={field.key}
              control={form.control}
              editLocale={editLocale}
              editorName={editorName}
              editorResetKey={editorResetKey}
              field={field}
              fieldData={fieldData}
              hasApp={hasApp}
              invalid={invalid}
              missingRequiredSurfaces={missingRequiredSurfaces}
              onLocaleChange={setDesktopLocale}
              onSurfaceChange={(nextSurface) =>
                setSurfaceByField((current) => ({
                  ...current,
                  [field.key]: nextSurface,
                }))
              }
              surface={surface}
              translationNamespace={translationNamespace}
            />
          );
        })}
      </div>
    </>
  );
}
