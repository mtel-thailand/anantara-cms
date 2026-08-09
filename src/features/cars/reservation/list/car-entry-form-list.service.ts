import { createClient } from "@/src/lib/supabase/client";
import { unwrap } from "@/src/lib/supabase/unwrap";
import { ownerReservationInformationRequests } from "@/src/features/cars/reservation/list/owner-reservation-list.helpers";
import {
  CarEntryFormListRpcSchema,
  type CarEntryFormListRpc,
} from "@/src/features/cars/reservation/list/car-entry-form-list.schema";
import type {
  CarEntryFormListItem,
  CarEntryFormListParams,
  CarEntryFormListResult,
  CarEntryFormRequestDetail,
} from "@/src/features/cars/reservation/list/car-entry-form-list.types";

function imageUrl(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const image = value as Record<string, unknown>;
  const storedUrl =
    typeof image.publicUrl === "string"
      ? image.publicUrl
      : typeof image.url === "string"
        ? image.url
        : "";

  if (!storedUrl || /^https?:\/\//i.test(storedUrl)) return storedUrl;

  const publicBaseUrl =
    process.env.NEXT_PUBLIC_IMAGE_PUBLIC_BASE_URL?.trim() || "";
  if (!publicBaseUrl) return storedUrl;

  return `${publicBaseUrl.replace(/\/$/, "")}/${storedUrl.replace(/^\//, "")}`;
}

function toCarEntryFormListItem(
  row: CarEntryFormListRpc["data"][number],
): CarEntryFormListItem {
  return {
    id: row.submission_vehicle_id,
    carEntryFormId: row.car_entry_form_id,
    highResolutionPhotosLink: row.high_resolution_photos_link,
    canFinalize: row.can_finalize,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    imageUrl: imageUrl(row.image),
    make: row.make_of_vehicle,
    model: row.model,
    ownerEmail: row.owner_email,
    ownerForenames: row.owner_forenames,
    ownerSurname: row.owner_surname,
    ownerReservationStatus: row.owner_reservation_status,
    seen: row.seen,
    status: row.status,
    submissionVehicleId: row.submission_vehicle_id,
    updatedAt: row.updated_at,
    vehicleRef: row.vehicle_ref,
  };
}

export async function getCarEntryForms({
  page,
  pageSize,
  query,
  sort,
  filters,
}: CarEntryFormListParams): Promise<CarEntryFormListResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_car_entry_forms_list", {
    p_page: page,
    p_page_size: pageSize,
    p_query: query.trim() || undefined,
    p_status: filters.status ?? undefined,
    p_has_deleted_at: filters.hasDeletedAt,
    p_sort_key: sort.key,
    p_sort_desc: sort.descending,
  });
  const result = CarEntryFormListRpcSchema.parse(unwrap(data, error));

  return {
    data: {
      items: result.data.map(toCarEntryFormListItem),
      statusCounts: result.status_counts,
    },
    total: result.total,
  };
}

export async function getCarEntryFormRequestDetail(
  submissionVehicleId: string,
): Promise<CarEntryFormRequestDetail> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("car_entry_forms")
    .select("id, request_note, submission_vehicle_id")
    .eq("submission_vehicle_id", submissionVehicleId)
    .maybeSingle();

  if (error) throw error;
  return {
    id: data?.id ?? submissionVehicleId,
    infoRequests: ownerReservationInformationRequests(
      data?.request_note ?? [],
    ),
    submissionVehicleId,
  };
}
