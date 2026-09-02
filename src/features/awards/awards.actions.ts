"use server";

import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import {
  parsePublishBestInClassInput,
  publishBestOfShowSchema,
  publishSpecialAwardsSchema,
} from "./awards.schema";
import {
  publishBestInClass,
  publishBestOfShow,
  publishSpecialAwards,
} from "./awards.persistence";

export async function publishBestInClassAction(payload: unknown) {
  const input = parsePublishBestInClassInput(payload);
  const { supabase } = await createAuthenticatedClient();
  return publishBestInClass(supabase, input);
}

export async function publishBestOfShowAction(payload: unknown) {
  const input = publishBestOfShowSchema.parse(payload);
  const { supabase } = await createAuthenticatedClient();
  return publishBestOfShow(supabase, input);
}

export async function publishSpecialAwardsAction(payload: unknown) {
  const input = publishSpecialAwardsSchema.parse(payload);
  const { supabase } = await createAuthenticatedClient();
  return publishSpecialAwards(supabase, input);
}
