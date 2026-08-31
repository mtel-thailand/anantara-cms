import type { Metadata } from "next";

import { CarClassesClient } from "@/src/features/cars/classes/car-classes-client";
import { getCarClassesData } from "@/src/features/cars/classes/car-classes.persistence";
import { createAuthenticatedClient } from "@/src/lib/supabase/server";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage() {
  const { supabase } = await createAuthenticatedClient();
  const initialData = await getCarClassesData(supabase);

  return <CarClassesClient initialData={initialData} />;
}
