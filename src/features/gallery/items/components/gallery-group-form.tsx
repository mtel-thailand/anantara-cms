"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import ControlledInput from "@/src/components/form/input";
import { FormLanguageToggle } from "@/src/components/form/language-toggle";
import { Label } from "@/src/components/ui/label";
import type { Locale } from "@/src/types/locale";
import {
  galleryGroupFormSchema,
  type GalleryGroupFormValues,
} from "../gallery-items.schema";

export type GalleryGroupFormHandle = {
  getValues: () => GalleryGroupFormValues;
  save: () => GalleryGroupFormValues | null;
};

export const GalleryGroupForm = forwardRef<
  GalleryGroupFormHandle,
  {
    defaultValues: GalleryGroupFormValues;
    labels: {
      name: string;
      placeholderEn: string;
      placeholderIt: string;
    };
    initialLanguage?: Locale;
    onCanSaveChange: (canSave: boolean) => void;
  }
>(({ defaultValues, labels, initialLanguage = "en", onCanSaveChange }, ref) => {
  const [language, setLanguage] = useState<Locale>(initialLanguage);
  const form = useForm<GalleryGroupFormValues>({
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver: zodResolver(galleryGroupFormSchema),
  });
  const name = form.watch("name");
  const nameIt = form.watch("nameIt");
  const field = language === "it" ? "nameIt" : "name";
  const dirty =
    name.trim() !== defaultValues.name.trim() ||
    nameIt.trim() !== defaultValues.nameIt.trim();
  const canSave = Boolean(name.trim()) && dirty;

  useEffect(() => {
    onCanSaveChange(canSave);
    return () => onCanSaveChange(false);
  }, [canSave, onCanSaveChange]);

  useImperativeHandle(
    ref,
    () => ({
      getValues: () => form.getValues(),
      save: () => {
        const parsed = galleryGroupFormSchema.safeParse(form.getValues());
        form.clearErrors();
        if (!parsed.success) {
          const message = parsed.error.flatten().fieldErrors.name?.[0];
          if (message) form.setError("name", { message });
          setLanguage("en");
          return null;
        }
        return parsed.data;
      },
    }),
    [form],
  );

  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <Label>
          {labels.name} <span className="text-destructive">*</span>
        </Label>
        <FormLanguageToggle
          size="sm"
          value={language}
          onValueChange={setLanguage}
          availability={{
            en: Boolean(name.trim()),
            it: Boolean(nameIt.trim()),
          }}
        />
      </div>
      <ControlledInput
        control={form.control}
        name={field}
        placeholder={
          language === "it" ? labels.placeholderIt : labels.placeholderEn
        }
        error={{
          hasError: Boolean(form.formState.errors[field]),
          message: form.formState.errors[field]?.message,
        }}
      />
    </div>
  );
});

GalleryGroupForm.displayName = "GalleryGroupForm";
