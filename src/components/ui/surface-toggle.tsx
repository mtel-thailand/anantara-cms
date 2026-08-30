"use client";

import { Monitor, Smartphone } from "lucide-react";

import { cn } from "@/src/lib/utils";

export type ContentSurface = "app" | "desktop";

const SURFACES = [
  { value: "desktop", Icon: Monitor },
  { value: "app", Icon: Smartphone },
] as const;

export function SurfaceToggle({
  value,
  onValueChange,
  labels,
  availability,
  disabled = false,
  disabledSurfaces = [],
  disabledTitle,
  className,
}: {
  value: ContentSurface;
  onValueChange: (value: ContentSurface) => void;
  labels: Record<ContentSurface, string>;
  availability?: Partial<Record<ContentSurface, boolean>>;
  disabled?: boolean;
  disabledSurfaces?: readonly ContentSurface[];
  disabledTitle?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Edit surface"
      aria-disabled={disabled || undefined}
      className={cn("inline-flex rounded-lg border bg-card p-0.5", className)}
    >
      {SURFACES.map(({ value: surface, Icon }) => {
        const active = value === surface;
        const filled = availability?.[surface];
        const surfaceDisabled = disabled || disabledSurfaces.includes(surface);
        const title = surfaceDisabled
          ? disabledTitle
          : `Edit ${labels[surface]} content — ${
              filled ? "content added" : "empty"
            }`;

        return (
          <button
            key={surface}
            type="button"
            aria-pressed={active}
            disabled={surfaceDisabled}
            title={title}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              active
                ? "bg-stone-200 text-stone-700 shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              surfaceDisabled && !active && "hover:text-muted-foreground",
            )}
            onClick={() => onValueChange(surface)}
          >
            <Icon className="size-3" />
            {labels[surface]}
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
