import type { Metadata } from "next";

import { GalleryContentFieldClient } from "@/src/features/gallery/content-field/gallery-content-field-client";
import { getContentFieldDraft } from "@/src/features/content-field/content-field.persistence";
import { getGalleryItemsData } from "@/src/features/gallery/items/gallery-items.persistence";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Gallery Content Field" };

export default async function GalleryContentFieldPage() {
  const { supabase } = await createAuthenticatedClient();
  const [initialDraft, initialGalleryItems, t] = await Promise.all([
    getContentFieldDraft(supabase, "gallery"),
    getGalleryItemsData(supabase),
    getTranslations("gallery.contentField"),
  ]);

  return (
    <GalleryContentFieldClient
      description={t("description")}
      initialDraft={initialDraft}
      initialGalleryItems={initialGalleryItems}
      title={t("title")}
    />
  );
}
