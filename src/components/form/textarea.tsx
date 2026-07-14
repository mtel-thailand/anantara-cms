import type { ComponentProps } from "react";
import { Control, Controller, FieldValues, Path } from "react-hook-form";

import { Textarea } from "@/src/components/ui/textarea";

interface ControlledTextareaProps<T extends FieldValues>
  extends Omit<
    ComponentProps<typeof Textarea>,
    "name" | "onBlur" | "onChange" | "value"
  > {
  control: Control<T>;
  name: Path<T>;
  onValueChange?: () => void;
}

export default function ControlledTextarea<T extends FieldValues>({
  control,
  name,
  onValueChange,
  ...props
}: ControlledTextareaProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
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
