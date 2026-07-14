import type { ComponentProps, ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/src/lib/utils";
import { Button } from "../button";
import { Label } from "../label";
import Text from "../text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export type DropdownOption = {
  className?: string;
  icon?: ReactNode;
  label: ReactNode;
  onSelect?: () => void;
  value: string;
};

export function Dropdown({
  "aria-invalid": ariaInvalid,
  align = "start",
  className,
  contentClassName,
  disabled,
  error,
  htmlFor,
  label,
  onValueChange,
  options,
  placeholder = "Select",
  showSelectedIndicator = true,
  trigger,
  required,
  value,
  ...props
}: Omit<ComponentProps<"button">, "onChange" | "value"> & {
  align?: ComponentProps<typeof DropdownMenuContent>["align"];
  contentClassName?: string;
  error?: {
    hasError: boolean;
    message?: string;
  };
  htmlFor?: string;
  label?: string;
  onValueChange?: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  showSelectedIndicator?: boolean;
  trigger?: ReactNode;
  required?: boolean;
  value?: string;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <Label htmlFor={htmlFor}>
          {label} {required ? <span className="text-destructive">*</span> : null}
        </Label>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          {trigger ?? (
            <Button
              type="button"
              variant="outline"
              aria-invalid={ariaInvalid}
              className={cn(
                "h-8 w-full justify-between px-2.5 font-normal",
                !selectedOption && "text-muted-foreground",
                className,
              )}
              disabled={disabled}
              {...props}
            >
              <span className="min-w-0 truncate">
                {selectedOption?.label ?? placeholder}
              </span>
              <ChevronDown className="size-4 opacity-60" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          className={cn(
            !trigger && "w-[--radix-dropdown-menu-trigger-width]",
            contentClassName,
          )}
        >
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              className={option.className}
              onSelect={() => {
                option.onSelect?.();
                onValueChange?.(option.value);
              }}
            >
              {showSelectedIndicator ? (
                <Check
                  className={cn(
                    "size-4",
                    option.value === value ? "opacity-100" : "opacity-0",
                  )}
                />
              ) : (
                option.icon
              )}
              <span className="min-w-0 truncate">{option.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error?.hasError ? (
        <Text size="sm" color="destructive">
          {error.message}
        </Text>
      ) : null}
    </div>
  );
}
