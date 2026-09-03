"use client";

import { useTranslations } from "next-intl";
import type { Control, Path } from "react-hook-form";

import ControlledInput from "@/src/components/form/input";
import { Card, CardContent } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import type { ContentFieldFormValues } from "../content-field.schema";
import type {
  ContentFieldEditorField,
  ContentFieldFieldData,
  ContentFieldTranslationNamespace,
} from "../content-field.types";

export function ContentEmailField({
  control,
  field,
  fieldData,
  invalid,
  translationNamespace,
}: {
  control: Control<ContentFieldFormValues>;
  field: ContentFieldEditorField;
  fieldData: ContentFieldFieldData | undefined;
  invalid: boolean;
  translationNamespace: ContentFieldTranslationNamespace;
}) {
  const t = useTranslations(translationNamespace);
  const inputId = `${field.key}-input`;

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="flex flex-col gap-2 sm:max-w-md">
          <Label htmlFor={inputId}>
            {field.label} <span className="text-destructive">*</span>
          </Label>
          <ControlledInput
            id={inputId}
            aria-invalid={invalid}
            control={control}
            name={
              `data.${field.key}.web.und` as Path<ContentFieldFormValues>
            }
            placeholder={t("emailPlaceholder")}
            type="email"
          />
          <p className="text-xs text-muted-foreground">{field.description}</p>
          {invalid ? (
            <p className="text-sm text-destructive">
              {fieldData?.web?.und?.trim()
                ? t("emailInvalid")
                : t("emailRequired")}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
