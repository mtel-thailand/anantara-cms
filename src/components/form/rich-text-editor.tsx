import type { ComponentProps } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { Controller } from "react-hook-form";

import ClientSideCustomEditor from "@/src/components/ui/editor/client-side-custom-editor";
import { cn } from "@/src/lib/utils";

type ControlledRichTextEditorProps<T extends FieldValues> = Omit<
  ComponentProps<typeof ClientSideCustomEditor>,
  "data" | "onChange"
> & {
  control: Control<T>;
  invalid?: boolean;
  name: Path<T>;
  onValueChange?: () => void;
};

export default function ControlledRichTextEditor<T extends FieldValues>({
  control,
  invalid = false,
  name,
  onValueChange,
  ...props
}: ControlledRichTextEditorProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={cn(invalid && "cke-field--invalid")}>
          <ClientSideCustomEditor
            {...props}
            data={typeof field.value === "string" ? field.value : ""}
            onChange={(value) => {
              field.onChange(value);
              onValueChange?.();
            }}
          />
        </div>
      )}
    />
  );
}
