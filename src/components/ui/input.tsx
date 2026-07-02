import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/src/lib/utils";
import { Button } from "./button";
import Text from "./text";
import { Label } from "./label";

export interface InputProps extends React.ComponentProps<"input"> {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: {
    hasError: boolean;
    message?: string;
  };
  rightButton?: {
    label: string;
    disabled?: boolean;
    onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    icon: LucideIcon;
  };
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type, label, htmlFor, required, error, rightButton, ...props },
    ref,
  ) => {
    const RightButtonIcon = rightButton?.icon;

    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          {label && (
            <Label htmlFor={htmlFor}>
              {label}{" "}{required && <span className="text-destructive">*</span>}
            </Label>
          )}
          <div className="relative">
            <input
              type={type}
              className={cn(
                "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1",
                "text-base transition-colors outline-hidden md:text-sm",
                "placeholder:text-muted-foreground",
                "file:inline-flex file:h-6 file:border-0 file:bg-transparent",
                "file:text-sm file:font-medium file:text-foreground",
                "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
                "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
                "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
                "aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/20",
                "dark:bg-input/30 dark:disabled:bg-input/80",
                "dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
                { "pr-8": rightButton },
                className,
              )}
              ref={ref}
              {...props}
            />
            {rightButton && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1/2 right-0.5 -translate-y-1/2 rounded-md"
                aria-label={rightButton?.label}
                disabled={rightButton?.disabled}
                onClick={rightButton?.onClick}
              >
                {RightButtonIcon && (
                  <RightButtonIcon className="size-4 text-muted-foreground" />
                )}
              </Button>
            )}
          </div>
        </div>
        {error?.hasError && (
          <Text size="sm" color="destructive">
            {error.message}
          </Text>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
