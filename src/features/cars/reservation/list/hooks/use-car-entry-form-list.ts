"use client";

import type { PaginationSort } from "@/src/hooks/use-pagination-state";
import { usePaginationState } from "@/src/hooks/use-pagination-state";
import { getCarEntryForms } from "@/src/features/cars/reservation/list/car-entry-form-list.service";
import type {
  CarEntryFormListData,
  CarEntryFormListFilters,
  CarEntryFormListSortKey,
} from "@/src/features/cars/reservation/list/car-entry-form-list.types";

const DEFAULT_SORT = {
  key: "updated",
  descending: true,
} satisfies PaginationSort<CarEntryFormListSortKey>;

export function useCarEntryFormList({
  pageSize,
  filters = { status: null, hasDeletedAt: false },
}: {
  pageSize: number;
  filters?: CarEntryFormListFilters;
}) {
  return usePaginationState<
    CarEntryFormListData,
    CarEntryFormListSortKey,
    CarEntryFormListFilters
  >({
    fetchPage: getCarEntryForms,
    pageSize,
    initialSort: DEFAULT_SORT,
    initialFilters: { ...filters },
  });
}
