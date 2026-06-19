type LogVariant = "info" | "success" | "warn" | "error" | "debug";

type LogFields = Record<
  string,
  string | number | boolean | null | undefined | object
>;

const variantStyles: Record<
  LogVariant,
  { label: string; color: string; method: "info" | "warn" | "error" | "debug" }
> = {
  info: { label: "INFO", color: "\x1b[36m", method: "info" },
  success: { label: "SUCCESS", color: "\x1b[32m", method: "info" },
  warn: { label: "WARN", color: "\x1b[33m", method: "warn" },
  error: { label: "ERROR", color: "\x1b[31m", method: "error" },
  debug: { label: "DEBUG", color: "\x1b[35m", method: "debug" },
};

const reset = "\x1b[0m";
const bold = "\x1b[1m";

function formatValue(value: LogFields[string]) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatFields(fields?: LogFields) {
  if (!fields) {
    return "";
  }

  return Object.entries(fields)
    .map(([key, value]) => {
      const formatted = formatValue(value);
      return formatted === undefined ? undefined : `${key}=${formatted}`;
    })
    .filter(Boolean)
    .join(" ");
}

export function log(
  scope: string,
  message: string,
  fields?: LogFields,
  variant: LogVariant = "info",
) {
  const style = variantStyles[variant];
  const fieldText = formatFields(fields);
  const line = [
    `${style.color}${bold}[${style.label}]${reset}`,
    `${style.color}[${scope}]${reset}`,
    message,
    fieldText,
  ]
    .filter(Boolean)
    .join(" ");

  console[style.method](line);
}

export const logger = {
  info: (scope: string, message: string, fields?: LogFields) =>
    log(scope, message, fields, "info"),
  success: (scope: string, message: string, fields?: LogFields) =>
    log(scope, message, fields, "success"),
  warn: (scope: string, message: string, fields?: LogFields) =>
    log(scope, message, fields, "warn"),
  error: (scope: string, message: string, fields?: LogFields) =>
    log(scope, message, fields, "error"),
  debug: (scope: string, message: string, fields?: LogFields) =>
    log(scope, message, fields, "debug"),
};
