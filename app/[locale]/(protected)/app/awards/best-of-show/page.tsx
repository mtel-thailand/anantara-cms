import type { Metadata } from "next";

import { BestOfShowClient } from "@/src/features/awards/best-of-show/best-of-show-client";
import { getBestOfShowData } from "@/src/features/awards/awards.persistence";
import { getContentFieldDraft } from "@/src/features/content-field/content-field.persistence";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";

export const metadata: Metadata = { title: "Best of Show" };

export default async function BestOfShowPage() {
  const { supabase } = await createAuthenticatedClient();
  const [awards, content] = await Promise.all([
    getBestOfShowData(supabase),
    getContentFieldDraft(supabase, "awards.best_of_show"),
  ]);
  return <BestOfShowClient initialData={{ awards, content }} />;
}
