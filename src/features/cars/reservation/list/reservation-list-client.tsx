"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { History, Mail, Search, SquarePen, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { PageHeader } from "@/src/components/page-header";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Pagination } from "@/src/components/ui/pagination";
import { Skeleton } from "@/src/components/ui/skeleton";
import ClientSideDraggableTable from "@/src/components/ui/table/client-side-custom-table";
import { Tabs } from "@/src/components/ui/tabs";
import Text from "@/src/components/ui/text";
import { Link } from "@/src/i18n/navigation";
import { formatDate } from "@/src/lib/date";
import type { Locale } from "@/src/types/locale";

import { useOwnerReservationList } from "./hooks/use-owner-reservation-list";
import type { OwnerReservationListItem } from "./owner-reservation-list.types";
import { FormStatusChip } from "./components/form-status-stepper";

const PAGE_SIZE = 10;

function ownerName(owner: OwnerReservationListItem) {
  return [owner.ownerTitle, owner.ownerForenames, owner.ownerSurname]
    .filter(Boolean)
    .join(" ");
}

function OwnerTableSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function ReservationFormListClient({ type }: { type?: "deleted" }) {
  const commonT = useTranslations("common");
  const locale = useLocale() as Locale;
  const isDeleted = type === "deleted";
  const [currentTab, setCurrentTab] = useState<"owner" | "car">("owner");
  const {
    data,
    total,
    pageCount,
    page,
    isLoading,
    query,
    sortingState,
    setPage,
    setQuery,
    setSortState,
  } = useOwnerReservationList({
    pageSize: PAGE_SIZE,
    filters: { status: null, hasDeletedAt: isDeleted },
  });
  const owners = data ?? [];
  const columns = useMemo<ColumnDef<OwnerReservationListItem, unknown>[]>(
    () => [
      {
        id: "owner",
        accessorFn: ownerName,
        header: "Owner",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex min-w-48 flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium">{ownerName(row.original)}</span>
              {!row.original.seen ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <span className="size-1.5 rounded-full bg-primary" /> New
                </span>
              ) : null}
            </div>
            <span className="text-xs text-muted-foreground">
              {row.original.ownerEmail}
            </span>
          </div>
        ),
      },
      {
        id: "approvedCars",
        accessorKey: "approvedVehicleCount",
        header: "Approved cars (Not Finalized)",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block text-center tabular-nums">
            {row.original.approvedVehicleCount}
          </span>
        ),
      },
      {
        id: "finalizedCars",
        accessorKey: "finalizedVehicleCount",
        header: "Finalized cars",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block text-center tabular-nums">
            {row.original.finalizedVehicleCount}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Form status",
        enableSorting: true,
        cell: ({ row }) => <FormStatusChip status={row.original.status} />,
      },
      {
        id: "updated",
        accessorKey: "updatedAt",
        header: "Last updated",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDate(row.original.updatedAt, locale)}
          </span>
        ),
      },
      {
        id: "action",
        accessorKey: "action",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/cars/submissions/${row.original.id}`}>
                <Mail className="size-3.5" /> Request info
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/cars/submissions/${row.original.id}`}>
                <SquarePen className="size-3.5" /> Review
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [locale],
  );

  return (
    <div>
      <PageHeader
        title="Car & reservation forms"
        description="Post-approval paperwork for accepted cars: request, review and approve each owner's registration and every car's entry form & certificate. Changes save immediately — approving both unlocks ‘Finalize car’."
        viewport={["desktop", "mobile"]}
      >
        {!isDeleted ? (
          <>
            <Button variant="ghost" asChild>
              <Link href="/app/cars/forms/deleted">
                <History className="size-4" />
                <Text size="sm">{commonT("deleteHistoryTitle")}</Text>
              </Link>
            </Button>
            <Button variant="outline" disabled={owners.length === 0}>
              <Trash2 className="size-4" />
              <Text size="sm">{commonT("clearData")}</Text>
            </Button>
          </>
        ) : null}
      </PageHeader>

      <Tabs
        value={currentTab}
        tabs={[
          {
            value: "owner",
            label: `Owner registration (${total})`,
            children: (
              <div className="flex min-w-0 flex-col gap-4 pt-4">
                <div className="ml-auto w-full max-w-80">
                  <Input
                    aria-label="Search owners"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name or email"
                    className="bg-card"
                    leftButton={{ icon: Search, label: "Search owners" }}
                  />
                </div>

                <Card className="w-full min-w-0 overflow-hidden rounded-lg shadow-none">
                  {isLoading ? (
                    <OwnerTableSkeleton />
                  ) : (
                    <ClientSideDraggableTable<OwnerReservationListItem>
                      data={owners}
                      columns={columns}
                      columnSorting={sortingState}
                      onColumnSortingChange={setSortState}
                      onReorder={() => {}}
                      className="max-h-none overflow-x-auto overflow-y-visible"
                      tableClassName="min-w-[850px] text-sm"
                      headerClassName="bg-muted/35"
                      bodyClassName="bg-card"
                      enableColumnSorting
                      enabledRowSorting={false}
                      emptyRow={
                        <div className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                          No owners match the current filters.
                        </div>
                      }
                    />
                  )}
                </Card>

                <Pagination
                  page={page}
                  pageCount={pageCount}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onPageChange={setPage}
                />
              </div>
            ),
          },
          {
            value: "car",
            label: "Car forms",
            children: (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Car forms table is not implemented yet.
              </div>
            ),
          },
        ]}
        setValue={setCurrentTab}
      />
    </div>
  );
}
