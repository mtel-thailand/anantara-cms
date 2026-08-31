"use server";

import { publishContentField } from "./content-field.persistence";
import { publishContentFieldSchema } from "./content-field.schema";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";

export async function publishContentFieldAction(payload: unknown) {
  const input = publishContentFieldSchema.parse(payload);
  const { supabase } = await createAuthenticatedClient();
  return publishContentField(supabase, input);
}
