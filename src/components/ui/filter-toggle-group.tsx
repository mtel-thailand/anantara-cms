"use client";

import type { ReactNode } from "react";
import { ToggleGroup } from "radix-ui";

import Text from "@/src/components/ui/text";
import { cn } from "@/src/lib/utils";

export type FilterToggleGroupItem<TValue extends string> = {
  ariaLabel?: string;
  count?: number;
  label: ReactNode;
  value: TValue;
};

export function FilterToggleGroup<TValue extends string>({
  ariaLabel = "Filter options",
  className,
  items,
  onValueChange,
  value,
}: {
  ariaLabel?: string;
  className?: string;
  items: readonly FilterToggleGroupItem<TValue>[];
  onValueChange: (value: TValue) => void;
  value: TValue;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={ariaLabel}
      className={cn("flex flex-wrap items-center gap-2", className)}
      onValueChange={(nextValue) => {
        if (nextValue) onValueChange(nextValue as TValue);
      }}
    >
      {items.map((item) => {
        const active = value === item.value;

        return (
          <ToggleGroup.Item
            key={item.value}
            value={item.value}
            aria-label={item.ariaLabel ?? `Filter by ${item.value}`}
            className={cn(
              "group flex cursor-pointer gap-1.5 rounded-xl border border-input px-3 py-2 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              {
                "border-ring/50 bg-primary/10 hover:bg-primary/10": active,
              },
            )}
          >
            {item.count !== undefined ? (
              <span
                className={cn(
                  "inline-flex h-4 min-w-4 items-center justify-center rounded bg-muted px-1 text-[10px] text-muted-foreground tabular-nums transition-colors group-hover:bg-muted/80 group-hover:text-foreground",
                  {
                    "bg-primary/15 text-primary group-hover:bg-primary/15 group-hover:text-primary":
                      active,
                  },
                )}
              >
                {item.count}
              </span>
            ) : null}
            <Text
              className={cn("transition-colors", {
                "group-hover:text-foreground": !active,
                "group-hover:text-primary": active,
              })}
              size="xs"
              weight="medium"
              color={active ? "primary" : "muted-foreground"}
            >
              {item.label}
            </Text>
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}
