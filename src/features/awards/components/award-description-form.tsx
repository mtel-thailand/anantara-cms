"use client";

import { forwardRef, useEffect, useImperativeHandle } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import ControlledTextarea from "@/src/components/form/textarea";
import type { ContentFieldData } from "@/src/features/content-field/content-field.types";
import {
  awardDescriptionFormSchema,
  type AwardDescriptionFormValues,
} from "../awards.schema";

export type AwardDescriptionFormHandle = {
  save: () => ContentFieldData | null;
};

export const AwardDescriptionForm = forwardRef<
  AwardDescriptionFormHandle,
  {
    initialData: ContentFieldData;
    fieldLabel: string;
    requiredError: string;
    onCanSaveChange: (canSave: boolean) => void;
  }
>(({ initialData, fieldLabel, requiredError, onCanSaveChange }, ref) => {
  const initialDescription = initialData.description?.shared?.und ?? "";
  const form = useForm<AwardDescriptionFormValues>({
    defaultValues: {
      description: initialDescription,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver: zodResolver(awardDescriptionFormSchema),
  });
  const description = useWatch({
    control: form.control,
    name: "description",
  });

  useEffect(() => {
    const normalizedDescription = description.trim();
    const normalizedInitialDescription = initialDescription.trim();

    onCanSaveChange(
      normalizedDescription.length > 0 &&
        normalizedDescription !== normalizedInitialDescription,
    );
  }, [description, initialDescription, onCanSaveChange]);

  useImperativeHandle(
    ref,
    () => ({
      save: () => {
        const parsed = awardDescriptionFormSchema.safeParse(form.getValues());
        if (!parsed.success) {
          form.setError("description", { message: requiredError });
          return null;
        }
        return {
          ...initialData,
          description: {
            shared: { und: parsed.data.description },
          },
        };
      },
    }),
    [form, initialData, requiredError],
  );

  return (
    <div className="px-5 py-4">
      <ControlledTextarea
        control={form.control}
        name="description"
        label={fieldLabel}
        required
        autoFocus
        className="min-h-24"
        error={{
          hasError: Boolean(form.formState.errors.description),
          message: form.formState.errors.description?.message,
        }}
      />
    </div>
  );
});
AwardDescriptionForm.displayName = "AwardDescriptionForm";
