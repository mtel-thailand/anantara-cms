import type { ComponentProps } from "react";

import { cn } from "@/src/lib/utils";
import { Label } from "./label";
import Text from "./text";

export interface TextareaProps extends ComponentProps<"textarea"> {
  error?: {
    hasError: boolean;
    message?: string;
  };
  htmlFor?: string;
  label?: string;
  required?: boolean;
}

export function Textarea({
  className,
  error,
  htmlFor,
  label,
  required,
  ...props
}: TextareaProps) {
  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <Label htmlFor={htmlFor}>
          {label} {required ? <span className="text-destructive">*</span> : null}
        </Label>
      ) : null}
      <textarea
        className={cn(
          "min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-hidden transition-colors",
          "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
          "disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-70",
          className,
        )}
        {...props}
      />
      {error?.hasError ? (
        <Text size="sm" color="destructive">
          {error.message}
        </Text>
      ) : null}
    </div>
  );
}
