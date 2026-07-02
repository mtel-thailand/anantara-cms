"use client";

import { LOCALES } from "@/src/constants/locale";
import { cn } from "@/src/lib/utils";
import { Locale } from "@/src/types/locale";

export type FormLanguageToggleProps = {
  value: Locale;
  onValueChange: (value: Locale) => void;
  size?: "default" | "sm";
  className?: string;
  disabled?: boolean;
  availability?: Partial<Record<Locale, boolean>>;
};

/** Switches the language currently being edited without changing the route. */
export function FormLanguageToggle({
  value: selectedLanguage,
  onValueChange,
  size = "default",
  className,
  disabled = false,
  availability,
}: FormLanguageToggleProps) {
  return (
    <div
      role="group"
      aria-label="Form language"
      className={cn(
        "inline-flex items-center rounded-lg border bg-card p-0.5",
        className,
      )}
    >
      {LOCALES.map(({ value, label }) => {
        const active = selectedLanguage === value;
        const filled = availability?.[value];

        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={
              availability
                ? `Edit in ${label} - ${filled ? "content added" : "empty"}`
                : `Edit in ${label}`
            }
            onClick={() => {
              if (!active) onValueChange(value);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-md font-medium uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value}
            {availability ? (
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  filled ? "bg-emerald-500" : "bg-current opacity-40",
                )}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
