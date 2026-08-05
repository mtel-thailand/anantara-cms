import { createClient } from "@/src/lib/supabase/client";
import { unwrap } from "@/src/lib/supabase/unwrap";

import {
  OwnerReservationListRpcSchema,
  type OwnerReservationListRpc,
} from "@/src/features/cars/reservation/list/owner-reservation-list.schema";
import type {
  OwnerReservationDetail,
  OwnerReservationListItem,
  OwnerReservationListParams,
  OwnerReservationListResult,
} from "@/src/features/cars/reservation/list/owner-reservation-list.types";
import type { Database } from "@/src/types/database.types";
import { ownerReservationInformationRequests } from "@/src/features/cars/reservation/list/owner-reservation-list.helpers";

type OwnerReservationRow =
  Database["public"]["Tables"]["owner_reservations"]["Row"];

function toOwnerReservationDetail(
  row: OwnerReservationRow,
  carNames: string[],
  ownerPackageName: string,
  roomCategoryName: string,
  deletedAt: string | null,
): OwnerReservationDetail {
  return {
    ...row,
    carNames,
    deletedAt,
    infoRequests: ownerReservationInformationRequests(row.request_note),
    ownerPackageName,
    roomCategoryName,
  };
}

function searchKeyword(query: string | undefined) {
  return query?.trim() || null;
}

function toOwnerReservationListItem(
  row: OwnerReservationListRpc["data"][number],
): OwnerReservationListItem {
  return {
    id: row.id,
    submissionId: row.submission_id,
    ownerTitle: row.owner_title ?? "",
    ownerForenames: row.owner_forenames ?? "",
    ownerSurname: row.owner_surname ?? "",
    ownerEmail: row.owner_email ?? "",
    status: row.status,
    seen: row.seen,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedVehicleCount: row.approved_vehicle_count,
    finalizedVehicleCount: row.finalized_vehicle_count,
  };
}

export async function getOwnerReservations({
  page,
  pageSize,
  query,
  sort,
  filters,
}: OwnerReservationListParams): Promise<OwnerReservationListResult> {
  const supabase = createClient();
  const keyword = searchKeyword(query);
  const { data, error } = await supabase.rpc("get_owner_reservations_list", {
    p_page: page,
    p_page_size: pageSize,
    p_query: keyword ?? undefined,
    p_status: filters.status ?? undefined,
    p_has_deleted_at: filters.hasDeletedAt,
    p_sort_key: sort.key,
    p_sort_desc: sort.descending,
  });
  const result = OwnerReservationListRpcSchema.parse(unwrap(data, error));

  return {
    data: {
      items: result.data.map(toOwnerReservationListItem),
      statusCounts: {
        all: result.status_counts.all,
        required: result.status_counts.required,
        requested: result.status_counts.requested,
        received: result.status_counts.received,
        approved: result.status_counts.approved,
      },
    },
    total: result.total,
  };
}

export async function getOwnerReservation(
  id: string,
): Promise<OwnerReservationDetail> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("owner_reservations")
    .select(
      "*, owner_packages(name, owner_package_room_categories(id, name))",
    )
    .eq("id", id)
    .single();
  const reservation = unwrap(data, error);

  const { data: vehicles, error: vehiclesError } = await supabase
    .from("car_submission_vehicles")
    .select("make_of_vehicle, model")
    .eq("submission_id", reservation.submission_id);
  const carNames = unwrap(vehicles, vehiclesError).map((vehicle) =>
    [vehicle.make_of_vehicle, vehicle.model].filter(Boolean).join(" "),
  );
  const roomCategory =
    reservation.owner_packages?.owner_package_room_categories.find(
      (category) =>
        category.id === reservation.room_category ||
        category.name === reservation.room_category,
    );

  return toOwnerReservationDetail(
    reservation,
    carNames,
    reservation.owner_packages?.name ?? "",
    roomCategory?.name ?? reservation.room_category ?? "",
    reservation.deleted_at,
  );
}

export async function markOwnerReservationSeen(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("owner_reservations")
    .update({ seen: true })
    .eq("id", id)
    .eq("seen", false)
    .select("id")
    .maybeSingle();

  if (error) throw error;
}
