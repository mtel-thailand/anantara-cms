"use client";

import { useTranslations } from "next-intl";
import type { Control, Path } from "react-hook-form";

import { FormLanguageToggle } from "@/src/components/form/language-toggle";
import ControlledRichTextEditor from "@/src/components/form/rich-text-editor";
import { Card, CardContent } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { SurfaceToggle } from "@/src/components/ui/surface-toggle";
import { hasContentFieldValue } from "../content-field.helpers";
import type { ContentFieldFormValues } from "../content-field.schema";
import type {
  ContentFieldEditorField,
  ContentFieldFieldData,
  ContentFieldLocale,
  ContentFieldSurface,
  ContentFieldTranslationNamespace,
} from "../content-field.types";

export function ContentRichTextField({
  control,
  editLocale,
  editorName,
  editorResetKey,
  field,
  fieldData,
  hasApp,
  invalid,
  missingRequiredSurfaces,
  onLocaleChange,
  onSurfaceChange,
  surface,
  translationNamespace,
}: {
  control: Control<ContentFieldFormValues>;
  editLocale: ContentFieldLocale;
  editorName: Path<ContentFieldFormValues>;
  editorResetKey: number;
  field: ContentFieldEditorField;
  fieldData: ContentFieldFieldData | undefined;
  hasApp: boolean;
  invalid: boolean;
  missingRequiredSurfaces: string[];
  onLocaleChange: (locale: ContentFieldLocale) => void;
  onSurfaceChange: (surface: ContentFieldSurface) => void;
  surface: ContentFieldSurface;
  translationNamespace: ContentFieldTranslationNamespace;
}) {
  const t = useTranslations(translationNamespace);

  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <Label>
              {field.label} <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              {field.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceToggle
              value={surface}
              labels={{ app: t("app"), desktop: t("desktop") }}
              availability={{
                app: hasContentFieldValue(
                  field.contentType,
                  fieldData?.app?.en,
                ),
                desktop: hasContentFieldValue(
                  field.contentType,
                  fieldData?.desktop?.en,
                ),
              }}
              disabledSurfaces={hasApp ? [] : ["app"]}
              disabledTitle={hasApp ? undefined : t("appUnavailable")}
              onValueChange={onSurfaceChange}
            />
            <FormLanguageToggle
              size="sm"
              value={editLocale}
              disabledValues={surface === "app" ? ["en", "it"] : []}
              disabledTitle={t("appEnglishOnly")}
              availability={{
                en: hasContentFieldValue(
                  field.contentType,
                  surface === "app"
                    ? fieldData?.app?.en
                    : fieldData?.desktop?.en,
                ),
                it: hasContentFieldValue(
                  field.contentType,
                  fieldData?.desktop?.it,
                ),
              }}
              onValueChange={onLocaleChange}
            />
          </div>
        </div>
        <div className="[&_.ck-editor__editable_inline]:min-h-[28rem] [&_.ck-editor__editable_inline]:px-10 [&_.ck-editor__editable_inline]:py-12">
          <ControlledRichTextEditor
            control={control}
            invalid={invalid}
            name={editorName}
            key={`${field.key}-${surface}-${editLocale}-${editorResetKey}`}
            placeholder={t(
              surface === "app" ? "appPlaceholder" : "desktopPlaceholder",
            )}
          />
          {invalid ? (
            <p className="text-sm text-destructive">
              {missingRequiredSurfaces.length === 1
                ? t("contentRequiredError", {
                    surface: missingRequiredSurfaces[0],
                  })
                : t("contentRequiredErrors", {
                    surfaces: missingRequiredSurfaces.join(` ${t("and")} `),
                  })}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
