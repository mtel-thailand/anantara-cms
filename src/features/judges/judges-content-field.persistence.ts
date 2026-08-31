import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { JudgesContentPreviewJudge } from "./judges.types";
import type { Database } from "@/src/types/database.types";

function absoluteImageUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;

  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_PUBLIC_BASE_URL?.trim() ?? "";
  return baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/${value.replace(/^\//, "")}`
    : value;
}

export async function getJudgesContentPreviewData(
  supabase: SupabaseClient<Database>,
): Promise<JudgesContentPreviewJudge[]> {
  const { data, error } = await supabase
    .from("judges")
    .select(
      "id, name, position, position_en, position_icon, position_it, profile_image, seq",
    )
    .order("seq", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) throw error;

  return data.map((judge) => ({
    id: judge.id,
    imageUrl: absoluteImageUrl(judge.profile_image),
    name: judge.name,
    position: {
      en: judge.position_en ?? judge.position ?? judge.position_it,
      it: judge.position_it ?? judge.position ?? judge.position_en,
    },
    positionIcon: judge.position_icon,
  }));
}
