import type { ComponentProps } from "react";
import { Control, Controller, FieldValues, Path } from "react-hook-form";

import {
  Dropdown,
  type DropdownOption,
} from "@/src/components/ui/dropdown/dropdown";

interface ControlledDropdownProps<T extends FieldValues>
  extends Omit<
    ComponentProps<typeof Dropdown>,
    "onValueChange" | "options" | "value"
  > {
  control: Control<T>;
  name: Path<T>;
  onValueChange?: (value: string) => void;
  options: DropdownOption[];
}

export default function ControlledDropdown<T extends FieldValues>({
  control,
  name,
  onValueChange,
  options,
  ...props
}: ControlledDropdownProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Dropdown
          {...props}
          value={field.value}
          options={options}
          onBlur={field.onBlur}
          onValueChange={(value) => {
            field.onChange(value);
            onValueChange?.(value);
          }}
        />
      )}
    />
  );
}
