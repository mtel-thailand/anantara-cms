import { createClient } from "@/src/lib/supabase/client";
import type {
  FinalizedCarListItem,
  FinalizedCarsData,
  FinalizedCarsPageParams,
  FinalizedCarStatus,
} from "@/src/features/cars/finalized/finalized-cars.types";
import type { SubmissionClass } from "@/src/features/cars/submission/submission.types";
import { unwrap } from "@/src/lib/supabase/unwrap";

function firstImageUrl(value: unknown) {
  if (!Array.isArray(value) || !value.length) return "";
  const first = value[0];
  if (typeof first === "string") return first;
  if (!first || typeof first !== "object" || Array.isArray(first)) return "";
  const image = first as Record<string, unknown>;
  const storedUrl =
    typeof image.publicUrl === "string"
      ? image.publicUrl
      : typeof image.url === "string"
        ? image.url
        : "";
  if (!storedUrl || /^https?:\/\//i.test(storedUrl)) return storedUrl;
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_PUBLIC_BASE_URL?.trim() || "";
  return baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/${storedUrl.replace(/^\//, "")}`
    : storedUrl;
}

type FinalizedCarRpcRow = {
  id: string;
  archived_at: string | null;
  car_entry_form_id: string | null;
  category_id: number | null;
  class_name: string | null;
  class_sequence: number | null;
  created_at: string;
  description_en: string | null;
  description_it: string | null;
  hide_owner_name: boolean;
  images: unknown;
  make: string;
  model: string;
  owner_email: string;
  owner_first_name: string;
  owner_form_needs_attention: boolean;
  owner_last_name: string;
  owner_reservation_id: string | null;
  status: FinalizedCarStatus;
  updated_at: string;
  vehicle_ref: string;
  year: number;
};

type FinalizedCarsRpcResult = {
  classes?: unknown;
  counts?: unknown;
  data?: unknown;
  total?: unknown;
};

function rpcClasses(value: unknown) {
  return Array.isArray(value) ? (value as SubmissionClass[]) : [];
}

function rpcResult(value: unknown): FinalizedCarsRpcResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Finalized cars RPC returned an invalid response.");
  }

  return value as FinalizedCarsRpcResult;
}

function rpcRows(value: unknown) {
  return Array.isArray(value) ? (value as FinalizedCarRpcRow[]) : [];
}

function rpcCounts(value: unknown): Record<FinalizedCarStatus, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { archived: 0, finalized: 0 };
  }

  const counts = value as Record<string, unknown>;
  return {
    archived: typeof counts.archived === "number" ? counts.archived : 0,
    finalized: typeof counts.finalized === "number" ? counts.finalized : 0,
  };
}

function toListItem(row: FinalizedCarRpcRow): FinalizedCarListItem {
  return {
    id: row.id,
    archivedAt: row.archived_at,
    carEntryFormId: row.car_entry_form_id,
    categoryId: row.category_id === null ? "" : String(row.category_id),
    className: row.class_name ?? "",
    classSequence: row.class_sequence,
    createdAt: row.created_at,
    descriptionEn: row.description_en ?? "",
    descriptionIt: row.description_it ?? "",
    hideOwnerName: row.hide_owner_name,
    imageUrl: firstImageUrl(row.images),
    make: row.make,
    model: row.model,
    ownerEmail: row.owner_email,
    ownerFirstName: row.owner_first_name,
    ownerFormNeedsAttention: row.owner_form_needs_attention,
    ownerLastName: row.owner_last_name,
    ownerReservationId: row.owner_reservation_id,
    status: row.status,
    updatedAt: row.updated_at,
    vehicleRef: row.vehicle_ref,
    year: row.year,
  };
}

export async function getFinalizedCarsPage({
  classFilter,
  page,
  pageSize,
  query,
  sort,
  status,
}: FinalizedCarsPageParams): Promise<FinalizedCarsData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_finalized_cars_list", {
    p_class_id:
      classFilter !== "all" && classFilter !== "unassigned"
        ? Number(classFilter)
        : undefined,
    p_page: page,
    p_page_size: pageSize,
    p_query: query.trim() || undefined,
    p_sort_desc: sort.descending,
    p_sort_key: sort.key,
    p_status: status,
    p_unassigned: classFilter === "unassigned",
  });
  const result = rpcResult(unwrap(data, error));

  return {
    classes: rpcClasses(result.classes),
    counts: rpcCounts(result.counts),
    items: rpcRows(result.data).map(toListItem),
    total: typeof result.total === "number" ? result.total : 0,
  };
}

export async function getFinalizedCarOwnerReservationId(
  submissionVehicleId: string,
) {
  const supabase = createClient();
  const { data: vehicle, error: vehicleError } = await supabase
    .from("car_submission_vehicles")
    .select("submission_id")
    .eq("id", submissionVehicleId)
    .single();
  const { submission_id: submissionId } = unwrap(vehicle, vehicleError);
  const { data: reservation, error: reservationError } = await supabase
    .from("owner_reservations")
    .select("id")
    .eq("submission_id", submissionId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reservationError) throw reservationError;
  return reservation?.id ?? null;
}
