"use client";

import type {
  ColumnDef,
  OnChangeFn,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { memo } from "react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import {
  FilterToggleGroup,
  type FilterToggleGroupItem,
} from "@/src/components/ui/filter-toggle-group";
import { Input } from "@/src/components/ui/input";
import { Pagination } from "@/src/components/ui/pagination";
import { Skeleton } from "@/src/components/ui/skeleton";
import ClientSideDraggableTable from "@/src/components/ui/table/client-side-custom-table";
import type {
  CarEntryFormFilter,
  CarEntryFormListItem,
} from "@/src/features/cars/reservation/list/car-entry-form-list.types";

const PAGE_SIZE = 10;

function CarTableSkeleton() {
  return (
    <div className="min-w-[850px]">
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <div
          key={index}
          className="grid min-h-16 grid-cols-[5rem_minmax(12rem,2fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(7rem,1fr)_minmax(9rem,1fr)] items-center gap-4 border-b px-2 py-2"
        >
          <Skeleton className="size-12 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </div>
  );
}

const CAR_TABLE_SKELETON = <CarTableSkeleton />;
const ignoreCarReorder = () => {};

const CarEntryFormResults = memo(function CarEntryFormResults({
  columns,
  columnVisibility,
  data,
  isLoading,
  onColumnSortingChange,
  onPageChange,
  page,
  pageCount,
  sortingState,
  total,
}: {
  columns: ColumnDef<CarEntryFormListItem, unknown>[];
  columnVisibility: VisibilityState;
  data: CarEntryFormListItem[];
  isLoading: boolean;
  onColumnSortingChange: OnChangeFn<SortingState>;
  onPageChange: (page: number) => void;
  page: number;
  pageCount: number;
  sortingState: SortingState;
  total: number;
}) {
  const locale = useLocale();
  const t = useTranslations("cars.reservation.list");
  const showSkeleton = isLoading && data.length === 0;

  return (
    <>
      <Card className="w-full min-w-0 overflow-hidden rounded-lg shadow-none">
        <ClientSideDraggableTable<CarEntryFormListItem>
          key={locale}
          data={data}
          columns={columns}
          columnSorting={sortingState}
          columnVisibility={columnVisibility}
          onColumnSortingChange={onColumnSortingChange}
          onReorder={ignoreCarReorder}
          className="max-h-none overflow-x-auto overflow-y-visible"
          tableClassName="min-w-[850px] text-sm"
          headerClassName="bg-muted/35"
          bodyClassName="bg-card"
          enableColumnSorting
          enabledRowSorting={false}
          emptyRow={
            showSkeleton ? (
              CAR_TABLE_SKELETON
            ) : (
              <div className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                {t("carEmpty")}
              </div>
            )
          }
        />
      </Card>
      <Pagination
        page={page}
        pageCount={pageCount}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={onPageChange}
      />
    </>
  );
});

const CarEntryFormTab = memo(function CarEntryFormTab({
  columns,
  columnVisibility,
  currentFilter = "all",
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
}: {
  columns: ColumnDef<CarEntryFormListItem, unknown>[];
  columnVisibility: VisibilityState;
  currentFilter?: CarEntryFormFilter;
  data: CarEntryFormListItem[];
  filterItems: readonly FilterToggleGroupItem<CarEntryFormFilter>[];
  isLoading: boolean;
  onColumnSortingChange: OnChangeFn<SortingState>;
  onClearFilters: () => void;
  onFilterChange: (filter: CarEntryFormFilter) => void;
  onPageChange: (page: number) => void;
  onQueryChange: (query: string) => void;
  page: number;
  pageCount: number;
  query: string;
  sortingState: SortingState;
  total: number;
}) {
  const t = useTranslations("cars.reservation.list");

  return (
    <div className="flex min-w-0 flex-col gap-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterToggleGroup
          ariaLabel={t("carFilterAria")}
          items={filterItems}
          value={currentFilter}
          onValueChange={onFilterChange}
        />
        <div className="flex items-center">
          {query.trim() ? (
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
            aria-label={t("carSearchAria")}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("carSearchPlaceholder")}
            className="min-w-60 bg-card"
            leftButton={{
              icon: Search,
              label: t("carSearchAria"),
              disabled: true,
            }}
          />
        </div>
      </div>
      <CarEntryFormResults
        columns={columns}
        columnVisibility={columnVisibility}
        data={data}
        isLoading={isLoading}
        onColumnSortingChange={onColumnSortingChange}
        onPageChange={onPageChange}
        page={page}
        pageCount={pageCount}
        sortingState={sortingState}
        total={total}
      />
    </div>
  );
});

export default CarEntryFormTab;
