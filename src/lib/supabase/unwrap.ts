// src/lib/supabase/unwrap.ts

export function unwrap<T>(data: T | null, error: unknown): T {
  if (error) throw error;
  if (data === null) {
    throw new Error("Supabase returned null data.");
  }
  return data as T;
}
