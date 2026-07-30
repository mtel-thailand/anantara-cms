import { createClient } from "@/src/lib/supabase/client";
import { unwrap } from "@/src/lib/supabase/unwrap";

import {
  OwnerReservationListRpcSchema,
  type OwnerReservationListRpc,
} from "./owner-reservation-list.schema";
import type {
  OwnerReservationDetail,
  OwnerReservationInformationRequest,
  OwnerReservationListItem,
  OwnerReservationListParams,
  OwnerReservationListResult,
} from "./owner-reservation-list.types";
import type { Database, Json } from "@/src/types/database.types";

type OwnerReservationRow =
  Database["public"]["Tables"]["owner_reservations"]["Row"];

function isInformationRequest(
  value: Json,
): value is OwnerReservationInformationRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.id === "string" &&
    typeof value.message === "string" &&
    typeof value.sentDate === "string"
  );
}

function informationRequests(value: Json): OwnerReservationInformationRequest[] {
  return Array.isArray(value) ? value.filter(isInformationRequest) : [];
}

function toOwnerReservationDetail(
  row: OwnerReservationRow,
  carNames: string[],
  ownerPackageName: string,
): OwnerReservationDetail {
  return {
    ...row,
    carNames,
    infoRequests: informationRequests(row.request_note),
    ownerPackageName,
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
    ownerTitle: row.owner_title,
    ownerForenames: row.owner_forenames,
    ownerSurname: row.owner_surname,
    ownerEmail: row.owner_email,
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
    .select("*, owner_packages(name)")
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

  return toOwnerReservationDetail(
    reservation,
    carNames,
    reservation.owner_packages?.name ?? "",
  );
}

export async function requestOwnerReservationInformation(
  id: string,
  message: string,
): Promise<OwnerReservationDetail> {
  if (!message.trim()) throw new Error("The information request is required.");

  const current = await getOwnerReservation(id);
  const requestedAt = new Date().toISOString();
  const request: OwnerReservationInformationRequest = {
    id: `request-${crypto.randomUUID()}`,
    message: message.trim(),
    sentDate: requestedAt.slice(0, 10),
  };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("owner_reservations")
    .update({
      request_note: [...current.infoRequests, request] as unknown as Json,
      requested_at: requestedAt,
      status: "requested",
      updated_at: requestedAt,
    })
    .eq("id", id)
    .eq("updated_at", current.updated_at)
    .select("*")
    .single();

  const saved = unwrap(data, error);
  return toOwnerReservationDetail(
    saved,
    current.carNames,
    current.ownerPackageName,
  );
}
