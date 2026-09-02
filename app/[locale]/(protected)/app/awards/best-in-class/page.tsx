import type { Metadata } from "next";

import { BestInClassClient } from "@/src/features/awards/best-in-class/best-in-class-client";
import { getBestInClassData } from "@/src/features/awards/awards.persistence";
import { getContentFieldDraft } from "@/src/features/content-field/content-field.persistence";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";

export const metadata: Metadata = { title: "Best in Class" };

export default async function BestInClassPage() {
  const { supabase } = await createAuthenticatedClient();
  const [awards, content] = await Promise.all([
    getBestInClassData(supabase),
    getContentFieldDraft(supabase, "awards.best_in_class"),
  ]);
  return <BestInClassClient initialData={{ awards, content }} />;
}
