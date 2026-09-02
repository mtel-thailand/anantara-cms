import type { Metadata } from "next";

import { GalleryItemsClient } from "@/src/features/gallery/items/gallery-items-client";
import { getGalleryItemsData } from "@/src/features/gallery/items/gallery-items.persistence";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";

export const metadata: Metadata = { title: "Gallery Items" };

export default async function GalleryItemsPage() {
  const { supabase } = await createAuthenticatedClient();
  const initialData = await getGalleryItemsData(supabase);
  return <GalleryItemsClient initialData={initialData} />;
}
