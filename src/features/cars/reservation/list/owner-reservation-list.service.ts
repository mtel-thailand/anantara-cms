import { createClient } from "@/src/lib/supabase/client";
import { unwrap } from "@/src/lib/supabase/unwrap";

import {
  OwnerReservationListRpcSchema,
  type OwnerReservationListRpc,
} from "./owner-reservation-list.schema";
import type {
  OwnerReservationListItem,
  OwnerReservationListParams,
  OwnerReservationListResult,
} from "./owner-reservation-list.types";

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
    data: result.data.map(toOwnerReservationListItem),
    total: result.total,
  };
}
