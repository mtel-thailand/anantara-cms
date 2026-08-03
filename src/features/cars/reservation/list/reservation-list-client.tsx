"use client";

import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import { Download, History, Mail, SquarePen, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { PageHeader } from "@/src/components/page-header";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Tabs } from "@/src/components/ui/tabs";
import Text from "@/src/components/ui/text";
import { type FilterToggleGroupItem } from "@/src/components/ui/filter-toggle-group";
import { Link, useRouter } from "@/src/i18n/navigation";
import { formatDate } from "@/src/lib/date";
import { capitalize } from "@/src/lib/string";
import { cn } from "@/src/lib/utils";
import type { Locale } from "@/src/types/locale";

import { useOwnerReservationList } from "./hooks/use-owner-reservation-list";
import {
  OWNER_RESERVATION_STATUSES,
  OwnerReservationFilter,
  type OwnerReservationListItem,
} from "./owner-reservation-list.types";
import { FormStatusChip } from "./components/form-status-stepper";
import { useModal } from "@/src/components/providers/modal-provider";
import useAsync from "@/src/hooks/use-async";
import CountBadge from "@/src/components/count-badge";
import NavigationButton from "@/src/components/navigation-button";
import OwnerReservationTab from "./components/owner-registration-tab";
import { Badge } from "@/src/components/ui/badge";
import { toast } from "sonner";
import { logger } from "@/src/lib/logger";
import { getOwnerReservation } from "./owner-reservation-list.service";
import { requestOwnerReservationInformationAction } from "./owner-reservation-list.actions";
import { downloadOwnerReservation } from "./owner-reservation-download";
import {
  createOwnerRequestInfoModalStore,
  OwnerRequestInfoModal,
  OwnerRequestInfoModalFooter,
} from "./components/owner-request-info-modal";

const PAGE_SIZE = 10;
const DEFAULT_OWNER_COLUMN_VISIBILITY: VisibilityState = { deleted: false };
const DELETED_OWNER_COLUMN_VISIBILITY: VisibilityState = {
  approvedCars: false,
  finalizedCars: false,
};

const OWNER_FILTER_VALUES = ["all", ...OWNER_RESERVATION_STATUSES] as const;

function ownerName(owner: OwnerReservationListItem) {
  return [owner.ownerTitle, owner.ownerForenames, owner.ownerSurname]
    .filter(Boolean)
    .join(" ");
}

function ClearSubmissionFormConfirmation({
  clearSubmissionForm,
}: {
  clearSubmissionForm: () => Promise<boolean>;
}) {
  const modal = useModal();
  const t = useTranslations("cars.submission.list");
  const commonT = useTranslations("common");
  const [value, setValue] = useState("");
  const { isLoading, execute } = useAsync(false);
  const confirmed = value === "delete";

  async function handleClear() {
    if (!confirmed || isLoading) return;

    await execute(async () => {
      const clearSuccess = await clearSubmissionForm();
      if (clearSuccess) modal.close();
    });
  }

  return (
    <>
      <div className="space-y-2 p-4">
        <Text.FormTitle size="base" className="font-medium">
          Clear all car & reservation forms?
        </Text.FormTitle>
        <Text size="sm" color="muted-foreground">
          This clears both tabs on this page — every car in the forms queue and
          its owner registration entries. Submitted owner registration details
          remain viewable on their finalized and archived cars. Cleared items
          move to the delete history, where they can be restored.
        </Text>
        <Text size="sm" color="muted-foreground" className="pt-2">
          {t.rich("clearConfirmInstruction", {
            keyword: (chunks) => (
              <strong className="font-semibold text-black">{chunks}</strong>
            ),
          })}
        </Text>
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 border-t bg-muted/50 p-4">
        <Button variant="outline" disabled={isLoading} onClick={modal.close}>
          {commonT("cancel")}
        </Button>
        <Button
          loading={isLoading}
          disabled={isLoading || !confirmed}
          onClick={() => void handleClear()}
        >
          {t("clearAction")}
        </Button>
      </div>
    </>
  );
}

export function ReservationFormListClient({ type }: { type?: "deleted" }) {
  const router = useRouter();
  const commonT = useTranslations("common");
  const locale = useLocale() as Locale;
  const isDeleted = type === "deleted";
  const modal = useModal();
  const [currentTab, setCurrentTab] = useState<"owner" | "car">("owner");
  const {
    data,
    total,
    pageCount,
    page,
    isLoading,
    query,
    sortingState,
    filters,
    setPage,
    setQuery,
    setSortState,
    setFilters,
    refresh,
  } = useOwnerReservationList({
    pageSize: PAGE_SIZE,
    filters: { status: null, hasDeletedAt: isDeleted },
  });

  const owners = data?.items ?? [];
  const filterItems = useMemo(
    () =>
      OWNER_FILTER_VALUES.map(
        (status): FilterToggleGroupItem<OwnerReservationFilter> => ({
          value: status,
          label: capitalize(status),
          count: data?.statusCounts[status] ?? 0,
        }),
      ),
    [data?.statusCounts],
  );

  const handleOwnerDownload = useCallback(
    async (owner: OwnerReservationListItem) => {
      try {
        downloadOwnerReservation(await getOwnerReservation(owner.id));
      } catch (error) {
        logger.error("OWNER-RESERVATIONS", "Failed to download registration", {
          error: error instanceof Error ? error.message : String(error),
          reservationId: owner.id,
        });
        toast.error("Couldn’t prepare the download", {
          description: "Please try again.",
        });
      }
    },
    [],
  );

  const handleOwnerRequestInfo = useCallback(
    async (owner: OwnerReservationListItem) => {
      try {
        const reservation = await getOwnerReservation(owner.id);
        const requestInfoStore = createOwnerRequestInfoModalStore();
        const sendRequest = async (message: string) => {
          const result = await requestOwnerReservationInformationAction({
            id: owner.id,
            message,
          });
          refresh();
          return result;
        };
        modal.handleShowShowCloseButton();
        modal.disableBackdropClose();
        modal.open({
          headerClassName: "border-b-0 px-4 !py-0 !pt-4",
          header: (
            <div className="pr-8">
              <Text.FormTitle size="xl">
                Request info — {ownerName(owner)}
              </Text.FormTitle>
              <Text size="sm" color="muted-foreground">
                Email the owner a request to fill in the owners’ registration
                form.
              </Text>
            </div>
          ),
          content: (
            <OwnerRequestInfoModal
              reservation={reservation}
              store={requestInfoStore}
            />
          ),
          footer: ({ loading, close, run }) => (
            <OwnerRequestInfoModalFooter
              close={close}
              loading={loading}
              onSend={sendRequest}
              reservation={reservation}
              run={run}
              store={requestInfoStore}
            />
          ),
        });
      } catch (error) {
        logger.error("OWNER-RESERVATIONS", "Failed to load request history", {
          error: error instanceof Error ? error.message : String(error),
          reservationId: owner.id,
        });
        toast.error("Couldn’t load the information requests", {
          description: "Please try again.",
        });
      }
    },
    [modal, refresh],
  );

  const columns = useMemo<ColumnDef<OwnerReservationListItem, unknown>[]>(
    () => [
      {
        id: "owner",
        accessorFn: ownerName,
        header: "Owner",
        enableSorting: false,
        cell: ({ row }) => (
          <div
            className={cn("flex min-w-48 flex-col", {
              "opacity-60": isDeleted,
            })}
          >
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
        enableHiding: true,
        cell: ({ row }) => (
          <span
            className={cn("block text-center tabular-nums", {
              "opacity-60": isDeleted,
            })}
          >
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
          <span
            className={cn("block text-center tabular-nums", {
              "opacity-60": isDeleted,
            })}
          >
            {row.original.finalizedVehicleCount}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Form status",
        enableSorting: true,
        cell: ({ row }) => (
          <div className={cn({ "opacity-60": isDeleted })}>
            <FormStatusChip status={row.original.status} />
          </div>
        ),
      },
      {
        id: "updated",
        accessorKey: "updatedAt",
        header: "Last updated",

        enableSorting: true,
        cell: ({ row }) => (
          <span
            className={cn("whitespace-nowrap text-muted-foreground", {
              "opacity-60": isDeleted,
            })}
          >
            {formatDate(row.original.updatedAt, locale)}
          </span>
        ),
      },
      {
        id: "deleted",
        accessorKey: "deletedAt",
        header: "Deleted",

        enableSorting: true,
        cell: ({ row }) => (
          <span
            className={cn("whitespace-nowrap text-muted-foreground", {
              "opacity-60": isDeleted,
            })}
          >
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
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleted || row.original.status === "approved"}
              onClick={() => void handleOwnerRequestInfo(row.original)}
            >
              <Mail className="size-3.5" /> Request info
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/cars/forms/owners/${row.original.id}`}>
                <SquarePen className="size-3.5" /> Review
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Download registration for ${ownerName(row.original)}`}
              title={
                row.original.status === "received" ||
                row.original.status === "approved"
                  ? "Download owner registration"
                  : "Enabled once the owner registration has been received"
              }
              disabled={
                isDeleted ||
                (row.original.status !== "received" &&
                  row.original.status !== "approved")
              }
              onClick={() => void handleOwnerDownload(row.original)}
            >
              <Download className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [handleOwnerDownload, handleOwnerRequestInfo, isDeleted, locale],
  );

  async function clearSubmissionForm() {
    // const clearedCount = await runAsyncTask({
    //   action: () => clearSubmissionVehicle(CLEARABLE_STATUSES),
    //   onError: (error) => {
    //     logger.error("CAR-SUBMISSIONS", "Failed to clear submissions", {
    //       error: error instanceof Error ? error.message : String(error),
    //     });
    //     toast.error(t("clearError"));
    //   },
    // });

    // if (clearedCount === undefined) return false;

    // toast.success(t("clearSuccess", { count: clearedCount }), {
    //   description: t("clearSuccessDescription"),
    // });
    // setRefreshing((current) => !current);
    return true;
  }

  const handleOwnerFilterChange = useCallback(
    (filter: OwnerReservationFilter) => {
      setFilters((current) => ({
        ...current,
        status: filter === "all" ? null : filter,
      }));
    },
    [setFilters],
  );

  function requestClearSubmissionForm() {
    modal.handleHideShowCloseButton();
    modal.preventBackdropClose();
    modal.open({
      className: "gap-0",
      content: (
        <ClearSubmissionFormConfirmation
          clearSubmissionForm={clearSubmissionForm}
        />
      ),
    });
  }
  return (
    <div>
      {isDeleted && (
        <NavigationButton
          text={"Back to forms"}
          onClick={() => router.push("/app/cars/forms")}
        />
      )}
      <PageHeader
        title={!isDeleted ? "Car & reservation forms" : "Delete history"}
        description={
          !isDeleted
            ? "Post-approval paperwork for accepted cars: request, review and approve each owner's registration and every car's entry form & certificate. Changes save immediately — approving both unlocks ‘Finalize car’."
            : "Cleared owner registrations and car entry forms. Restore any one to move it back onto the Car & reservation forms page."
        }
        viewport={!isDeleted ? ["desktop", "mobile"] : undefined}
        titleAccessory={
          isDeleted && (
            <Badge
              variant="outline"
              className="border-muted-foreground/30 bg-muted text-muted-foreground"
            >
              <Text size="xs" weight="medium" color="muted-foreground">
                {`${owners.length} deleted`}
              </Text>
            </Badge>
          )
        }
      >
        {!isDeleted ? (
          <>
            <Button variant="ghost" asChild>
              <Link href="/app/cars/forms/deleted">
                <History className="size-4" />
                <Text size="sm">{commonT("deleteHistoryTitle")}</Text>
              </Link>
            </Button>
            <Button
              variant="outline"
              disabled={owners.length === 0}
              onClick={requestClearSubmissionForm}
            >
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
            label: (
              <div className="flex items-center gap-1.5">
                <CountBadge count={total} />
                <Text size="xs" color="primary">
                  Owner registration
                </Text>
              </div>
            ),
            children: (
              <OwnerReservationTab
                data={owners}
                filterItems={filterItems}
                columns={columns}
                columnVisibility={
                  isDeleted
                    ? DELETED_OWNER_COLUMN_VISIBILITY
                    : DEFAULT_OWNER_COLUMN_VISIBILITY
                }
                sortingState={sortingState}
                onColumnSortingChange={setSortState}
                onFilterChange={handleOwnerFilterChange}
                onPageChange={setPage}
                onQueryChange={setQuery}
                page={page}
                pageCount={pageCount}
                query={query}
                total={total}
                isLoading={isLoading}
                currentFilter={filters.status ?? "all"}
              />
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
