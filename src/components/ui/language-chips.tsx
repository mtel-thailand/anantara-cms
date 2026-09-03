import { Badge } from "./badge";
import { cn } from "@/src/lib/utils";

export function LanguageChips({
  availability,
  className,
}: {
  availability: Record<"en" | "it", boolean>;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1", className)}>
      {(["en", "it"] as const).map((locale) => (
        <Badge
          key={locale}
          variant="outline"
          className={cn(
            "rounded-sm border px-1 py-px text-[10px] font-medium uppercase tracking-wide",
            availability[locale]
              ? "border-transparent bg-secondary text-secondary-foreground"
              : "border-dashed border-border text-muted-foreground/60",
          )}
        >
          {locale}
        </Badge>
      ))}
    </div>
  );
}
