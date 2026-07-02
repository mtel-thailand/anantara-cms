"use client";

import {
  AGENDA_ICON_FILES,
  AGENDA_ICON_LABELS,
  AgendaIcon,
} from "@/src/constants/agenda-icons";
import { cn } from "@/src/lib/utils";

/**
 * Renders an agenda icon SVG (from `public/images/agenda-icons/`) via a CSS mask so the
 * glyph paints in `currentColor` — letting it sit muted in tables and crimson
 * when selected, regardless of the source SVG's own colours.
 */
export function AgendaIconGlyph({
  icon,
  className,
}: {
  icon: AgendaIcon;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={AGENDA_ICON_LABELS[icon]}
      style={{
        maskImage: `url(${AGENDA_ICON_FILES[icon]})`,
        WebkitMaskImage: `url(${AGENDA_ICON_FILES[icon]})`,
      }}
      className={cn(
        "inline-block size-5 shrink-0 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]",
        className,
      )}
    />
  );
}
