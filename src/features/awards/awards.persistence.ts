import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AwardsCatalog,
  BestInClassData,
  BestInClassRole,
  BestOfShowData,
  SpecialAwardsData,
} from "./awards.types";
import type {
  PublishBestInClassInput,
  PublishBestOfShowInput,
  PublishSpecialAwardsInput,
} from "./awards.schema";
import type { Database, Json } from "@/src/types/database.types";

type ServerSupabaseClient = SupabaseClient<Database>;

function absoluteImageUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_PUBLIC_BASE_URL?.trim() || "";
  return baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/${value.replace(/^\//, "")}`
    : value;
}

function firstImageUrl(images: Json): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  const first = images[0];
  if (typeof first === "string") return absoluteImageUrl(first);
  if (!first || typeof first !== "object" || Array.isArray(first)) return null;
  const candidate = first.publicUrl ?? first.url;
  return typeof candidate === "string" ? absoluteImageUrl(candidate) : null;
}

async function getAwardsCatalog(
  supabase: ServerSupabaseClient,
): Promise<AwardsCatalog> {
  const [classResult, carResult] = await Promise.all([
    supabase
      .from("car_categories")
      .select("id, name, seq")
      .eq("enable", true)
      .order("seq", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("cars")
      .select(
        "id, category_id, hide_owner_name, images, name, owner, ref, submission_vehicle_id, year",
      )
      .not("category_id", "is", null)
      .order("name", { ascending: true }),
  ]);
  if (classResult.error) throw classResult.error;
  if (carResult.error) throw carResult.error;

  return {
    classes: classResult.data.map((item) => ({
      id: item.id,
      name: item.name,
      sequence: item.seq,
    })),
    cars: carResult.data.map((car) => ({
      id: car.id,
      categoryId: car.category_id,
      hideOwnerName: car.hide_owner_name,
      imageUrl: firstImageUrl(car.images),
      name: car.name,
      owner: car.owner,
      reference: car.ref ?? "",
      submissionVehicleId: car.submission_vehicle_id,
      year: car.year,
    })),
  };
}

function roleFromLabel(label: string): BestInClassRole {
  return /runner[\s-]?up/i.test(label) ? "runnerUp" : "winner";
}

function romanNumeral(value: number) {
  const numerals: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remaining = value;
  let result = "";
  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }
  return result;
}

export async function getBestInClassData(
  supabase: ServerSupabaseClient,
): Promise<BestInClassData> {
  const [catalog, result] = await Promise.all([
    getAwardsCatalog(supabase),
    supabase
      .from("car_awards")
      .select("id, award_label, car_category_id, car_id")
      .eq("award_category", "best_in_class")
      .eq("active", true),
  ]);
  if (result.error) throw result.error;
  return {
    ...catalog,
    entries: result.data.flatMap((row) =>
      row.car_category_id === null
        ? []
        : [
            {
              id: row.id,
              carId: row.car_id,
              categoryId: row.car_category_id,
              role: roleFromLabel(row.award_label),
            },
          ],
    ),
  };
}

export async function getBestOfShowData(
  supabase: ServerSupabaseClient,
): Promise<BestOfShowData> {
  const [catalog, result] = await Promise.all([
    getAwardsCatalog(supabase),
    supabase
      .from("car_awards")
      .select("id, car_id")
      .eq("award_category", "best_of_show")
      .eq("active", true)
      .order("seq", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  if (result.error) throw result.error;
  return {
    ...catalog,
    entry: { id: result.data?.id ?? null, carId: result.data?.car_id ?? null },
  };
}

export async function getSpecialAwardsData(
  supabase: ServerSupabaseClient,
): Promise<SpecialAwardsData> {
  const [catalog, carResult, figureResult] = await Promise.all([
    getAwardsCatalog(supabase),
    supabase
      .from("car_awards")
      .select("id, award_label, award_label_it, car_id, seq")
      .eq("award_category", "special_award")
      .eq("active", true),
    supabase
      .from("special_awards")
      .select(
        "id, award_label, award_label_it, award_description, award_description_it, image, name, seq",
      )
      .eq("award_category", "notable_figure")
      .eq("active", true),
  ]);
  if (carResult.error) throw carResult.error;
  if (figureResult.error) throw figureResult.error;
  return {
    ...catalog,
    items: [
      ...carResult.data.map((row) => ({
        id: row.id,
        persisted: true as const,
        kind: "car" as const,
        title: row.award_label,
        titleIt: row.award_label_it ?? "",
        carId: row.car_id,
        personName: "",
        description: "",
        descriptionIt: "",
        imageUrl: null,
        sequence: row.seq,
        removed: false,
      })),
      ...figureResult.data.map((row) => ({
        id: row.id,
        persisted: true as const,
        kind: "figure" as const,
        title: row.award_label,
        titleIt: row.award_label_it ?? "",
        carId: null,
        personName: row.name ?? "",
        description: row.award_description ?? "",
        descriptionIt: row.award_description_it ?? "",
        imageUrl: row.image ? absoluteImageUrl(row.image) : null,
        sequence: row.seq,
        removed: false,
      })),
    ].sort((left, right) => left.sequence - right.sequence),
  };
}

async function deactivateMissingCarAwards(
  supabase: ServerSupabaseClient,
  category: "best_in_class" | "best_of_show" | "special_award",
  retainedIds: string[],
) {
  let query = supabase
    .from("car_awards")
    .update({ active: false })
    .eq("award_category", category)
    .eq("active", true);
  if (retainedIds.length > 0)
    query = query.not("id", "in", `(${retainedIds.join(",")})`);
  const { error } = await query.select("id");
  if (error) throw error;
}

export async function publishBestInClass(
  supabase: ServerSupabaseClient,
  input: PublishBestInClassInput,
) {
  const retainedIds = input.entries.flatMap((entry) =>
    entry.id && entry.carId ? [entry.id] : [],
  );
  await deactivateMissingCarAwards(supabase, "best_in_class", retainedIds);
  for (const entry of input.entries) {
    if (!entry.carId) continue;
    const label = `Class ${romanNumeral(entry.categoryId)} ${entry.role === "winner" ? "Winner" : "Runner-up"}`;
    const color = entry.role === "winner" ? "gold" : "silver";
    const payload = {
      active: true,
      award_category: "best_in_class",
      award_color: color,
      award_icon: null,
      award_label: label,
      badge_color: color,
      car_category_id: entry.categoryId,
      car_id: entry.carId,
      partners: "minor",
      seq: entry.role === "winner" ? 1 : 2,
    };
    const result = entry.id
      ? await supabase
          .from("car_awards")
          .update(payload)
          .eq("id", entry.id)
          .select("id")
          .single()
      : await supabase.from("car_awards").insert(payload).select("id").single();
    if (result.error) throw result.error;
  }
  return getBestInClassData(supabase);
}

export async function publishBestOfShow(
  supabase: ServerSupabaseClient,
  input: PublishBestOfShowInput,
) {
  const retainedIds =
    input.entry.id && input.entry.carId ? [input.entry.id] : [];
  await deactivateMissingCarAwards(supabase, "best_of_show", retainedIds);
  if (input.entry.carId) {
    const payload = {
      active: true,
      award_category: "best_of_show",
      award_color: "primary",
      award_icon: "awardsWhite",
      award_label: "Best of Show Award Winner",
      badge_color: "gold",
      car_category_id: null,
      car_id: input.entry.carId,
      partners: "minor",
      seq: 1,
    };
    const result = input.entry.id
      ? await supabase
          .from("car_awards")
          .update(payload)
          .eq("id", input.entry.id)
          .select("id")
          .single()
      : await supabase.from("car_awards").insert(payload).select("id").single();
    if (result.error) throw result.error;
  }
  return getBestOfShowData(supabase);
}

export async function publishSpecialAwards(
  supabase: ServerSupabaseClient,
  input: PublishSpecialAwardsInput,
) {
  const retainedCarIds = input.items.flatMap((item) =>
    item.persisted && item.kind === "car" && !item.removed ? [item.id] : [],
  );
  await deactivateMissingCarAwards(supabase, "special_award", retainedCarIds);

  const retainedFigureIds = input.items.flatMap((item) =>
    item.persisted && item.kind === "figure" && !item.removed ? [item.id] : [],
  );
  let figureDeactivate = supabase
    .from("special_awards")
    .update({ active: false })
    .eq("award_category", "notable_figure")
    .eq("active", true);
  if (retainedFigureIds.length > 0)
    figureDeactivate = figureDeactivate.not(
      "id",
      "in",
      `(${retainedFigureIds.join(",")})`,
    );
  const figureDeactivateResult = await figureDeactivate.select("id");
  if (figureDeactivateResult.error) throw figureDeactivateResult.error;

  for (const item of input.items) {
    if (item.removed) continue;
    if (item.kind === "car") {
      if (!item.carId) continue;
      const payload = {
        active: true,
        award_category: "special_award",
        award_color: "gold",
        award_icon: null,
        award_label: item.title,
        award_label_it: item.titleIt || null,
        badge_color: "gold",
        car_category_id: null,
        car_id: item.carId,
        partners: "minor",
        seq: item.sequence,
      };
      const result = item.persisted
        ? await supabase
            .from("car_awards")
            .update(payload)
            .eq("id", item.id)
            .select("id")
            .single()
        : await supabase
            .from("car_awards")
            .insert(payload)
            .select("id")
            .single();
      if (result.error) throw result.error;
    } else {
      const payload = {
        active: true,
        award_category: "notable_figure",
        award_color: "gold",
        award_icon: null,
        award_label: item.title,
        award_label_it: item.titleIt || null,
        badge_color: "gold",
        award_description: item.description || null,
        award_description_it: item.descriptionIt || null,
        image: item.imageUrl || null,
        name: item.personName || null,
        seq: item.sequence,
      };
      const result = item.persisted
        ? await supabase
            .from("special_awards")
            .update(payload)
            .eq("id", item.id)
            .select("id")
            .single()
        : await supabase
            .from("special_awards")
            .insert(payload)
            .select("id")
            .single();
      if (result.error) throw result.error;
    }
  }
  return getSpecialAwardsData(supabase);
}
