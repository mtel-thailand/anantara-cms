import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Input, type InputProps } from "@/src/components/ui/input";

interface ControlledInputProps<T extends FieldValues> extends Omit<
  InputProps,
  "value" | "onChange" | "onBlur"
> {
  control: Control<T>;
  name: Path<T>;
}

export default function ControlledInput<T extends FieldValues>({
  control,
  name,
  ...props
}: ControlledInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => <Input {...field} {...props} />}
    />
  );
}
