import type { Metadata } from "next";

import { getContentFieldDraft } from "@/src/features/content-field/content-field.persistence";
import { JudgesContentFieldClient } from "@/src/features/judges/judges-content-field-client";
import { getJudgesContentPreviewData } from "@/src/features/judges/judges-content-field.persistence";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Judges Content Field" };

export default async function JudgesContentFieldPage() {
  const { supabase } = await createAuthenticatedClient();
  const [initialDraft, initialJudges, t] = await Promise.all([
    getContentFieldDraft(supabase, "judges"),
    getJudgesContentPreviewData(supabase),
    getTranslations("judges.contentField"),
  ]);

  return (
    <JudgesContentFieldClient
      description={t("description")}
      initialDraft={initialDraft}
      initialJudges={initialJudges}
      title={t("title")}
    />
  );
}
