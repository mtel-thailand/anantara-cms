import type { ComponentProps } from "react";
import {
  Control,
  Controller,
  FieldValues,
  Path,
  UseControllerProps,
} from "react-hook-form";

import { Textarea } from "@/src/components/ui/textarea";

interface ControlledTextareaProps<T extends FieldValues> extends Omit<
  ComponentProps<typeof Textarea>,
  "name" | "onBlur" | "onChange" | "value"
> {
  rules?: UseControllerProps<T>["rules"];
  control: Control<T>;
  name: Path<T>;
  onValueChange?: () => void;
}

export default function ControlledTextarea<T extends FieldValues>({
  control,
  name,
  onValueChange,
  rules,
  ...props
}: ControlledTextareaProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <Textarea
          {...field}
          {...props}
          onChange={(event) => {
            field.onChange(event);
            onValueChange?.();
          }}
        />
      )}
    />
  );
}
