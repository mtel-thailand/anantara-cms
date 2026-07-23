import { DEFAULT_TZ } from "@/src/constants/timezone";
import type { Locale } from "@/src/types/locale";
import dayjs from "./dayjs";

type DateInput = Date | string | null | undefined;
type RequiredDateInput = Exclude<DateInput, null | undefined>;
type DateUnit = "day" | "month" | "year";

export const ISO_DATE_FORMAT = "YYYY-MM-DD";

const TIME_FORMAT = "HH:mm";
const TIME_WITH_SECONDS_FORMAT = "HH:mm:ss";
const EMPTY_DISPLAY = "—";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

function isDateOnly(value: unknown): value is string {
  return typeof value === "string" && DATE_ONLY_PATTERN.test(value);
}

function isTimeOnly(value: unknown): value is string {
  return typeof value === "string" && TIME_ONLY_PATTERN.test(value);
}

function parseRomeDate(value: DateInput) {
  if (!value) return null;

  const date = isDateOnly(value)
    ? dayjs.tz(value, ISO_DATE_FORMAT, DEFAULT_TZ)
    : dayjs(value).tz(DEFAULT_TZ);

  return date.isValid() ? date : null;
}

function formatDateValue(value: DateInput, format: string): string {
  return parseRomeDate(value)?.format(format) ?? EMPTY_DISPLAY;
}

/** Calendar date in Europe/Rome; Date objects preserve calendar-picker days. */
export function toISODate(value: RequiredDateInput): string {
  if (isDateOnly(value)) return value;

  const date =
    value instanceof Date ? dayjs(value) : dayjs(value).tz(DEFAULT_TZ);

  return date.isValid() ? date.format(ISO_DATE_FORMAT) : "";
}

export function formatDate(value: DateInput, locale: Locale = "en"): string {
  const date = parseRomeDate(value);
  if (!date) return EMPTY_DISPLAY;

  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: DEFAULT_TZ,
  }).format(date.toDate());
}

/** Full weekday + date in the interface locale, e.g. "Friday, 22 May 2026". */
export function formatLongDate(
  value: DateInput,
  locale: Locale = "en",
): string {
  const date = parseRomeDate(value);
  if (!date) return EMPTY_DISPLAY;

  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: DEFAULT_TZ,
  }).format(date.toDate());
}

/** Editorial date format for Press entries, e.g. "08 April 2026". */
export function formatPressDate(value: DateInput): string {
  return formatDateValue(value, "DD MMMM YYYY");
}

/** UTC midnight for a calendar date, matching the agendas table format. */
export function toUTCStartOfDay(value: RequiredDateInput): string {
  const calendarDate = toISODate(value);
  const date = dayjs.utc(calendarDate, ISO_DATE_FORMAT, true);

  return date.isValid() ? date.startOf("day").toISOString() : "";
}

/** Europe/Rome time without seconds, e.g. "18:30". */
export function formatTime(value: DateInput): string {
  if (!value) return EMPTY_DISPLAY;

  if (isTimeOnly(value)) {
    const format = value.length === 5 ? TIME_FORMAT : TIME_WITH_SECONDS_FORMAT;
    const time = dayjs(value, format, true);

    return time.isValid() ? time.format(TIME_FORMAT) : EMPTY_DISPLAY;
  }

  const time = dayjs(value).tz(DEFAULT_TZ);

  return time.isValid() ? time.format(TIME_FORMAT) : EMPTY_DISPLAY;
}

/** Time range, e.g. "17:00 – 18:30". Falls back to a single start time. */
export function formatTimeRange(
  startTime: DateInput,
  endTime?: DateInput,
): string {
  const start = formatTime(startTime);
  const end = formatTime(endTime);

  if (start === EMPTY_DISPLAY) return start;

  return end === EMPTY_DISPLAY ? start : `${start} – ${end}`;
}

/** Applies a Europe/Rome wall-clock time and returns the corresponding instant. */
export function setTime(date: Date | string, time: string): Date | null {
  const parsedDate = dayjs(date);
  const selectedTime = dayjs(time, TIME_FORMAT, true);

  if (!parsedDate.isValid() || !selectedTime.isValid()) return null;

  const calendarDate = isDateOnly(date)
    ? date
    : parsedDate.tz(DEFAULT_TZ).format(ISO_DATE_FORMAT);
  const zonedDateTime = dayjs.tz(
    `${calendarDate} ${selectedTime.format(TIME_FORMAT)}`,
    `${ISO_DATE_FORMAT} ${TIME_FORMAT}`,
    DEFAULT_TZ,
  );
  console.log("zonedDateTime.toDate()", zonedDateTime.toString());
  return zonedDateTime.isValid() ? zonedDateTime.toDate() : null;
}

export function isSameDate(
  left: DateInput,
  right: DateInput,
  unit: DateUnit = "day",
): boolean {
  if (!left || !right) return false;

  const leftCalendarDate = toISODate(left);
  const rightCalendarDate = toISODate(right);

  if (!leftCalendarDate || !rightCalendarDate) return false;
  if (unit === "day") return leftCalendarDate === rightCalendarDate;

  const leftDate = dayjs.tz(leftCalendarDate, ISO_DATE_FORMAT, DEFAULT_TZ);
  const rightDate = dayjs.tz(rightCalendarDate, ISO_DATE_FORMAT, DEFAULT_TZ);

  return (
    leftDate.isValid() &&
    rightDate.isValid() &&
    leftDate.isSame(rightDate, unit)
  );
}

export function hasDuplicateDate(
  dates: DateInput[],
  dateToCheck: DateInput,
): boolean {
  return dates.some((date) => isSameDate(date, dateToCheck));
}
