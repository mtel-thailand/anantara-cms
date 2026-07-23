import { logger } from "@/src/lib/logger";

function getErrorFields(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  if (typeof error === "object" && error !== null) {
    const fields: Record<string, string | number | boolean | null> = {};
    const maybeError = error as Record<string, unknown>;

    for (const key of ["code", "message", "status"] as const) {
      const value = maybeError[key];

      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        fields[key] = value;
      }
    }

    return fields;
  }

  return { errorType: typeof error };
}

export function unwrap<T>(data: T | null, error: unknown): T {
  if (error) {
    logger.warn("SUPABASE", "Query returned an error", getErrorFields(error));
    throw error;
  }

  if (data === null) {
    logger.warn("SUPABASE", "Query returned null data");
    throw new Error("Supabase returned null data.");
  }

  return data as T;
}
