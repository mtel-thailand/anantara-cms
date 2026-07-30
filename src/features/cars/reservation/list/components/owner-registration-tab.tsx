"use client";

import type {
  ColumnDef,
  OnChangeFn,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Pagination } from "@/src/components/ui/pagination";
import { Skeleton } from "@/src/components/ui/skeleton";
import ClientSideDraggableTable from "@/src/components/ui/table/client-side-custom-table";
import {
  FilterToggleGroup,
  type FilterToggleGroupItem,
} from "@/src/components/ui/filter-toggle-group";

import { useDebounce } from "@/src/hooks/use-debounce";
import {
  OwnerReservationFilter,
  OwnerReservationListItem,
} from "../owner-reservation-list.types";
import { Button } from "@/src/components/ui/button";

const PAGE_SIZE = 10;

function OwnerTableSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

const OWNER_TABLE_SKELETON = <OwnerTableSkeleton />;
const OWNER_TABLE_EMPTY = (
  <div className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
    No owners yet — owners appear here once their car is approved from
    Submissions.
  </div>
);

const OwnerReservationTab = memo(function OwnerReservationTab({
  columns,
  columnVisibility,
  data,
  filterItems,
  isLoading,
  onColumnSortingChange,
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
  const [searchQuery, setSearchQuery] = useState<string>(query);
  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    onQueryChange(debouncedQuery);
  }, [debouncedQuery, onQueryChange]);

  const ignoreOwnerReorder = useCallback(() => {}, []);

  return (
    <div className="flex min-w-0 flex-col gap-4 pt-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <FilterToggleGroup
          ariaLabel="Filter owner reservations by status"
          items={filterItems}
          value={currentFilter}
          onValueChange={onFilterChange}
        />
        <div className="flex items-center">
          {searchQuery.trim() ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-fit text-muted-foreground"
              onClick={() => {
                setSearchQuery("");
                onFilterChange("all");
                onPageChange(1);
              }}
            >
              <X className="size-3.5" /> Clear filters
            </Button>
          ) : null}
          <Input
            aria-label="Search owners"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name or email..."
            className="bg-card min-w-60"
            leftButton={{
              icon: Search,
              label: "Search owners",
              disabled: true,
            }}
          />
        </div>
      </div>

      <Card className="w-full min-w-0 overflow-hidden rounded-lg shadow-none">
        <ClientSideDraggableTable<OwnerReservationListItem>
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
          emptyRow={isLoading ? OWNER_TABLE_SKELETON : OWNER_TABLE_EMPTY}
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
