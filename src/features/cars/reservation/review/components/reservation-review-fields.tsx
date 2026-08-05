import { Check, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { Input } from "@/src/components/ui/input";
import { cn } from "@/src/lib/utils";

export function ReviewField({ className, label, value }: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <Input
      label={label}
      value={value}
      disabled
      readOnly
      containerClassName={className}
      className="disabled:cursor-default disabled:opacity-100"
    />
  );
}

export function ReviewBool({ label, value }: { label: string; value: boolean | null }) {
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <span aria-hidden className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-sm border",
        value
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-muted/40 text-muted-foreground",
      )}>
        {value ? <Check className="size-3" /> : value === null ? <Minus className="size-3 opacity-50" /> : null}
      </span>
      <span className={cn("text-sm", value ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}

export function ReviewSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}
