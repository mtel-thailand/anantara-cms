"use client";

import type {
  ColumnDef,
  OnChangeFn,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { memo, useCallback } from "react";

import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Pagination } from "@/src/components/ui/pagination";
import { Skeleton } from "@/src/components/ui/skeleton";
import ClientSideDraggableTable from "@/src/components/ui/table/client-side-custom-table";
import {
  FilterToggleGroup,
  type FilterToggleGroupItem,
} from "@/src/components/ui/filter-toggle-group";

import {
  OwnerReservationFilter,
  OwnerReservationListItem,
} from "../owner-reservation-list.types";
import { Button } from "@/src/components/ui/button";

const PAGE_SIZE = 10;

function OwnerTableSkeleton() {
  return (
    <div className="min-w-[850px]">
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <div
          key={index}
          className="grid min-h-14 grid-cols-[minmax(12rem,2fr)_minmax(7rem,1fr)_minmax(6rem,1fr)_minmax(8rem,1fr)_minmax(7rem,1fr)_minmax(14rem,2fr)] items-center gap-4 border-b px-2 py-2"
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="mx-auto h-4 w-8" />
          <Skeleton className="mx-auto h-4 w-8" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="size-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

const OWNER_TABLE_SKELETON = <OwnerTableSkeleton />;
const OwnerReservationTab = memo(function OwnerReservationTab({
  columns,
  columnVisibility,
  data,
  filterItems,
  isLoading,
  onColumnSortingChange,
  onClearFilters,
  onFilterChange,
  onPageChange,
  onQueryChange,
  page,
  pageCount,
  query,
  sortingState,
  total,
  currentFilter = "all",
}: {
  columns: ColumnDef<OwnerReservationListItem, unknown>[];
  columnVisibility: VisibilityState;
  data: OwnerReservationListItem[];
  filterItems: readonly FilterToggleGroupItem<OwnerReservationFilter>[];
  isLoading: boolean;
  onColumnSortingChange: OnChangeFn<SortingState>;
  onClearFilters: () => void;
  onFilterChange: (filter: OwnerReservationFilter) => void;
  onPageChange: (page: number) => void;
  onQueryChange: (query: string) => void;
  page: number;
  pageCount: number;
  query: string;
  sortingState: SortingState;
  total: number;
  currentFilter?: OwnerReservationFilter;
}) {
  const locale = useLocale();
  const t = useTranslations("cars.reservation.list");
  const ignoreOwnerReorder = useCallback(() => {}, []);
  const emptyRow = (
    <div className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {t("empty")}
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4 pt-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <FilterToggleGroup
          ariaLabel={t("filterAria")}
          items={filterItems}
          value={currentFilter}
          onValueChange={onFilterChange}
        />
        <div className="flex items-center">
          {query.trim() || currentFilter !== "all" ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-fit text-muted-foreground"
              onClick={onClearFilters}
            >
              <X className="size-3.5" /> {t("clearFilters")}
            </Button>
          ) : null}
          <Input
            aria-label={t("searchAria")}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="bg-card min-w-60"
            leftButton={{
              icon: Search,
              label: t("searchAria"),
              disabled: true,
            }}
          />
        </div>
      </div>

      <Card className="w-full min-w-0 overflow-hidden rounded-lg shadow-none">
        <ClientSideDraggableTable<OwnerReservationListItem>
          key={locale}
          data={isLoading ? [] : data}
          columns={columns}
          columnSorting={sortingState}
          columnVisibility={columnVisibility}
          onColumnSortingChange={onColumnSortingChange}
          onReorder={ignoreOwnerReorder}
          className="max-h-none overflow-x-auto overflow-y-visible"
          tableClassName="min-w-[850px] text-sm"
          headerClassName="bg-muted/35"
          bodyClassName="bg-card"
          enableColumnSorting
          enabledRowSorting={false}
          emptyRow={isLoading ? OWNER_TABLE_SKELETON : emptyRow}
        />
      </Card>

      <Pagination
        page={page}
        pageCount={pageCount}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
});

export default OwnerReservationTab;
