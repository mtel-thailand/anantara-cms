import type { Metadata } from "next";

import { CarsContentFieldClient } from "@/src/features/cars/content-field/cars-content-field-client";
import { getContentFieldDraft } from "@/src/features/content-field/content-field.persistence";
import { getCarClassesData } from "@/src/features/cars/classes/car-classes.persistence";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Cars Content Field" };

export default async function CarsContentFieldPage() {
  const { supabase } = await createAuthenticatedClient();
  const [initialDraft, carClasses, t] = await Promise.all([
    getContentFieldDraft(supabase, "cars.classes"),
    getCarClassesData(supabase),
    getTranslations("cars.contentField"),
  ]);

  return (
    <CarsContentFieldClient
      description={t("description")}
      initialClasses={carClasses.classes}
      initialDraft={initialDraft}
      title={t("title")}
    />
  );
}
