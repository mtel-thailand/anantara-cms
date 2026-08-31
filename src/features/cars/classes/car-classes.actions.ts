"use server";

import { publishCarClasses } from "@/src/features/cars/classes/car-classes.persistence";
import { publishCarClassesSchema } from "@/src/features/cars/classes/car-classes.schema";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";

export async function publishCarClassesAction(payload: unknown) {
  const input = publishCarClassesSchema.parse(payload);
  const { supabase } = await createAuthenticatedClient();
  return publishCarClasses(supabase, input);
}
