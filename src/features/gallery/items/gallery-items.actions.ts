"use server";

import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import { publishGalleryItems } from "./gallery-items.persistence";
import { publishGalleryItemsSchema } from "./gallery-items.schema";

export async function publishGalleryItemsAction(payload: unknown) {
  const input = publishGalleryItemsSchema.parse(payload);
  const { supabase } = await createAuthenticatedClient();
  return publishGalleryItems(supabase, input);
}
