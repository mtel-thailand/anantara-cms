"use client";

import { useLocale } from "next-intl";
import { LOCALES } from "@/src/constants/locale";
import { cn } from "@/src/lib/utils";
import type { Locale } from "@/src/types/locale";
import { usePathname, useRouter } from "@/src/i18n/navigation";
import { useParams } from "next/navigation";

/**
 * Segmented EN / IT control bound to the global edit language. Switching it
 * flips every bilingual field on the page to that language at once.
 *
 * When `availability` is passed, each segment shows a small status dot —
 * **green** when that language has content, muted when it is still empty — so
 * editors can see at a glance which translations are filled. (The global
 * top-bar toggle omits it and stays dot-free.)
 */
export function LanguageToggle({
  size = "default",
  className,
  availability,
}: {
  size?: "default" | "sm";
  className?: string;
  /** Per-language "has content" flags; renders a dot inside each segment. */
  availability?: Partial<Record<Locale, boolean>>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const params = useParams();

  return (
    <div
      role="group"
      aria-label="Edit language"
      className={cn(
        "inline-flex items-center rounded-lg border bg-card p-0.5",
        className,
      )}
    >
      {LOCALES.map(({ value, label }) => {
        const active = locale === value;
        const filled = availability?.[value];
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            title={
              availability
                ? `Edit in ${label} — ${filled ? "content added" : "empty"}`
                : `Edit in ${label}`
            }
            onClick={() =>
              router.replace(
                // @ts-expect-error -- TypeScript will validate that only known `params`
                // are used in combination with a given `pathname`. Since the two will
                // always match for the current route, we can skip runtime checks.
                { pathname, params },
                { locale: value },
              )
            }
            className={cn(
              "flex items-center gap-1.5 rounded-md font-medium uppercase transition-colors",
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
