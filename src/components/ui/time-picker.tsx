"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type WheelEvent,
} from "react";
import { ClockIcon } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import {
  type MainPopoverProps,
  PopoverContent,
  PopoverTrigger,
  PopoverWrapper,
} from "@/src/components/ui/popover";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { cn } from "@/src/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
/** Minute presets shown in the picker (5-minute steps). */
const MINUTE_STEPS = Array.from({ length: 12 }, (_, i) => i * 5);

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/** "HH:MM" → minutes since midnight, or null when unset/invalid. */
function toMinutes(value: string | undefined | null): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function parse(value: string): { hour: number; minute: number } | null {
  const total = toMinutes(value);
  if (total === null) return null;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export interface TimePickerProps {
  container?: MainPopoverProps["container"];
  /** Current value as "HH:MM" (24h), or "" when unset. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest allowed time, inclusive ("HH:MM"). Times before it are disabled. */
  min?: string | null;
  /** Latest allowed time, inclusive ("HH:MM"). Times after it are disabled. */
  max?: string | null;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function TimePicker({
  container,
  value,
  onChange,
  min,
  max,
  id,
  invalid,
  disabled,
  placeholder = "Select time",
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  const minMins = toMinutes(min);
  const maxMins = toMinutes(max);

  // The hour column drives which minutes are reachable. Until an hour is
  // picked we preview against hour 0 so the minute column still makes sense.
  const activeHour = selected?.hour ?? 0;

  // Keep any off-grid minute from existing data selectable (e.g. 10:37).
  const minuteSet = new Set(MINUTE_STEPS);
  if (selected) minuteSet.add(selected.minute);
  const minutes = [...minuteSet].sort((a, b) => a - b);

  function withinRange(total: number) {
    if (minMins !== null && total < minMins) return false;
    if (maxMins !== null && total > maxMins) return false;
    return true;
  }

  // An hour is reachable if at least one of its selectable minutes is in range.
  function hourDisabled(hour: number) {
    return !minutes.some((m) => withinRange(hour * 60 + m));
  }

  function selectHour(hour: number) {
    // Snap the minute into range when the previous one is no longer valid.
    let minute = selected?.minute ?? 0;
    if (!withinRange(hour * 60 + minute)) {
      const firstValid = minutes.find((m) => withinRange(hour * 60 + m));
      minute = firstValid ?? minute;
    }
    onChange(`${pad(hour)}:${pad(minute)}`);
  }

  function selectMinute(minute: number) {
    onChange(`${pad(activeHour)}:${pad(minute)}`);
  }

  return (
    <PopoverWrapper open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid}
          className={cn(
            "w-full justify-start font-normal tabular-nums",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <ClockIcon className="text-muted-foreground" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[60] w-auto p-0"
        align="start"
        side="bottom"
        container={container}
        // Re-scroll the selected rows into view each time the picker opens.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex divide-x" key={open ? "open" : "closed"}>
          <TimeColumn label="Hour">
            {HOURS.map((hour) => (
              <TimeOption
                key={hour}
                selected={selected?.hour === hour}
                disabled={hourDisabled(hour)}
                onClick={() => selectHour(hour)}
              >
                {pad(hour)}
              </TimeOption>
            ))}
          </TimeColumn>
          <TimeColumn label="Minute">
            {minutes.map((minute) => (
              <TimeOption
                key={minute}
                selected={selected?.minute === minute}
                disabled={!withinRange(activeHour * 60 + minute)}
                onClick={() => selectMinute(minute)}
              >
                {pad(minute)}
              </TimeOption>
            ))}
          </TimeColumn>
        </div>
      </PopoverContent>
    </PopoverWrapper>
  );
}

function TimeColumn({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  // The picker is portalled outside the dialog, so the dialog's scroll-lock
  // (react-remove-scroll) swallows wheel events here — only thumb-dragging
  // scrolls. Manually translate the wheel into scrollTop on the viewport so
  // hovering anywhere over the column scrolls it.
  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    const viewport = e.currentTarget.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]",
    );
    if (viewport) viewport.scrollTop += e.deltaY;
  }

  return (
    <div className="flex flex-col">
      <span className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <ScrollArea className="h-56" onWheel={handleWheel}>
        <div className="flex flex-col gap-0.5 p-1.5">{children}</div>
      </ScrollArea>
    </div>
  );
}

function TimeOption({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  // Bring the active row into view when the picker mounts.
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "center" });
  }, [selected]);

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "w-12 rounded-md px-2 py-1.5 text-center text-sm tabular-nums transition-colors",
        selected
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent hover:text-accent-foreground",
        disabled && "pointer-events-none text-muted-foreground/40 line-through",
      )}
    >
      {children}
    </button>
  );
}
