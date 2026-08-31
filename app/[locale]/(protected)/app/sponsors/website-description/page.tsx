import type { Metadata } from "next";

import { getContentFieldDraft } from "@/src/features/content-field/content-field.persistence";
import { SponsorsContentFieldClient } from "@/src/features/sponsors/content-field/sponsors-content-field-client";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Sponsors Content Field" };

export default async function SponsorsContentFieldPage() {
  const { supabase } = await createAuthenticatedClient();
  const [initialDraft, t] = await Promise.all([
    getContentFieldDraft(supabase, "sponsors"),
    getTranslations("sponsors.contentField"),
  ]);

  return <SponsorsContentFieldClient description={t("description")} initialDraft={initialDraft} title={t("title")} />;
}
