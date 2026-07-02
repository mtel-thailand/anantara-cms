import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Input, type InputProps } from "@/src/components/ui/input";

interface ControlledCalendarProps<T extends FieldValues> extends Omit<
  InputProps,
  "value" | "onChange" | "onBlur"
> {
  control: Control<T>;
  name: Path<T>;
}

export default function ControlledCalendar<T extends FieldValues>({
  control,
  name,
  ...props
}: ControlledCalendarProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => <Input {...field} {...props} />}
    />
  );
}
