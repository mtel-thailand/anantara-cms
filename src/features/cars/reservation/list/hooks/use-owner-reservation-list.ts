"use client";

import { usePaginationState } from "@/src/hooks/use-pagination-state";
import type { PaginationSort } from "@/src/hooks/use-pagination-state";

import { getOwnerReservations } from "@/src/features/cars/reservation/list/owner-reservation-list.service";
import type {
  OwnerReservationListData,
  OwnerReservationListFilters,
  OwnerReservationListSortKey,
} from "@/src/features/cars/reservation/list/owner-reservation-list.types";

const DEFAULT_SORT = {
  key: "updated",
  descending: true,
} satisfies PaginationSort<OwnerReservationListSortKey>;

export function useOwnerReservationList({
  pageSize,
  filters = { status: null, hasDeletedAt: false },
}: {
  pageSize: number;
  filters?: OwnerReservationListFilters;
}) {
  return usePaginationState<
    OwnerReservationListData,
    OwnerReservationListSortKey,
    OwnerReservationListFilters
  >({
    fetchPage: getOwnerReservations,
    pageSize,
    initialSort: DEFAULT_SORT,
    initialFilters: { ...filters },
  });
}
