"use client";

import FileUploadSection, {
  type FileUploadSectionProps,
} from "@/src/components/file-upload-section";
import {
  Controller,
  type Control,
  type FieldPathByValue,
  type FieldValues,
} from "react-hook-form";

type ControlledFileUploadSectionProps<T extends FieldValues> = Omit<
  FileUploadSectionProps,
  "error" | "name" | "onBlur" | "onChange" | "value"
> & {
  control: Control<T>;
  name: FieldPathByValue<T, File[]>;
  onValueChange?: (files: File[]) => void;
};

function findErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;

  const record = error as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;

  for (const value of Object.values(record)) {
    const nestedMessage = findErrorMessage(value);
    if (nestedMessage) return nestedMessage;
  }

  return undefined;
}

export default function ControlledFileUploadSection<T extends FieldValues>({
  control,
  name,
  onValueChange,
  ...props
}: ControlledFileUploadSectionProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const files = Array.isArray(field.value)
          ? field.value.filter(
              (value: unknown): value is File => value instanceof File,
            )
          : [];

        return (
          <FileUploadSection
            {...props}
            name={field.name}
            value={files}
            error={findErrorMessage(fieldState.error)}
            onBlur={field.onBlur}
            onChange={(nextFiles) => {
              field.onChange(nextFiles);
              onValueChange?.(nextFiles);
            }}
          />
        );
      }}
    />
  );
}
