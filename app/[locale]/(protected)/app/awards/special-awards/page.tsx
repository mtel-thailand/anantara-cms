import type { Metadata } from "next";

import { SpecialAwardsClient } from "@/src/features/awards/special-awards/special-awards-client";
import { getSpecialAwardsData } from "@/src/features/awards/awards.persistence";
import { getContentFieldDraft } from "@/src/features/content-field/content-field.persistence";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";

export const metadata: Metadata = { title: "Special Awards" };

export default async function SpecialAwardsPage() {
  const { supabase } = await createAuthenticatedClient();
  const [awards, content] = await Promise.all([
    getSpecialAwardsData(supabase),
    getContentFieldDraft(supabase, "awards.special_awards"),
  ]);
  return <SpecialAwardsClient initialData={{ awards, content }} />;
}
