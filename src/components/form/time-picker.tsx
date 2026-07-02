import { Control, Controller, FieldValues, Path } from "react-hook-form";
import {
  TimePicker,
  type TimePickerProps,
} from "@/src/components/ui/time-picker";

interface ControlledTimePickerProps<T extends FieldValues> extends Omit<
  TimePickerProps,
  "value" | "onChange"
> {
  control: Control<T>;
  name: Path<T>;
}

export default function ControlledTimePicker<T extends FieldValues>({
  control,
  name,
  ...props
}: ControlledTimePickerProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => <TimePicker {...field} {...props} />}
    />
  );
}
