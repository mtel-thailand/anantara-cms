import { Control, Controller, FieldValues, Path } from "react-hook-form";
import type { ChangeEvent } from "react";
import { Input, type InputProps } from "@/src/components/ui/input";

interface ControlledInputProps<T extends FieldValues> extends Omit<
  InputProps,
  "value" | "onChange" | "onBlur"
> {
  control: Control<T>;
  name: Path<T>;
  onValueChange?: () => void;
}

export default function ControlledInput<T extends FieldValues>({
  control,
  name,
  onValueChange,
  ...props
}: ControlledInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const value =
          typeof field.value === "number" && Number.isNaN(field.value)
            ? ""
            : field.value;

        return (
          <Input
            {...field}
            {...props}
            value={value}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              field.onChange(
                props.type === "number"
                  ? event.target.value === ""
                    ? ""
                    : event.target.valueAsNumber
                  : event,
              );
              onValueChange?.();
            }}
          />
        );
      }}
    />
  );
}
