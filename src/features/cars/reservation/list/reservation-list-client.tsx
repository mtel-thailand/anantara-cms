"use client";

import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import {
  Download,
  Eye,
  History,
  Mail,
  RotateCcw,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

import { useOwnerReservationList } from "@/src/features/cars/reservation/list/hooks/use-owner-reservation-list";
import {
  OWNER_RESERVATION_STATUSES,
  OwnerReservationFilter,
  type OwnerReservationListItem,
} from "@/src/features/cars/reservation/list/owner-reservation-list.types";
import { FormStatusChip } from "@/src/features/cars/reservation/list/components/form-status-stepper";
import { useModal } from "@/src/components/providers/modal-provider";
import useAsync from "@/src/hooks/use-async";
import CountBadge from "@/src/components/count-badge";
import NavigationButton from "@/src/components/navigation-button";
import OwnerReservationTab from "@/src/features/cars/reservation/list/components/owner-registration-tab";
import { Badge } from "@/src/components/ui/badge";
import { toast } from "sonner";
import { logger } from "@/src/lib/logger";
import { runAsyncTask } from "@/src/lib/async";
import { getOwnerReservation } from "@/src/features/cars/reservation/list/owner-reservation-list.service";
import {
  clearOwnerReservationFormsAction,
  requestOwnerReservationInformationAction,
  restoreOwnerReservationAction,
} from "@/src/features/cars/reservation/list/owner-reservation-list.actions";
import { downloadOwnerReservation } from "@/src/features/cars/reservation/list/owner-reservation-download";
import {
  createOwnerRequestInfoModalStore,
  OwnerRequestInfoModal,
  OwnerRequestInfoModalFooter,
} from "@/src/features/cars/reservation/list/components/owner-request-info-modal";
import { useNotificationContext } from "@/src/components/providers/notification-provider";

const PAGE_SIZE = 10;
const RESERVATION_UPDATE_TOAST_ID = "owner-reservation-list-update";
const DEFAULT_OWNER_COLUMN_VISIBILITY: VisibilityState = { deleted: false };
const DELETED_OWNER_COLUMN_VISIBILITY: VisibilityState = {
  approvedCars: false,
  finalizedCars: false,
};

const OWNER_FILTER_VALUES = ["all", ...OWNER_RESERVATION_STATUSES] as const;

function ownerName(owner: OwnerReservationListItem) {
  return [owner.ownerForenames, owner.ownerSurname].filter(Boolean).join(" ");
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
  const t = useTranslations("cars.submission.list");
  const reservationT = useTranslations("cars.reservation.list");
  const commonT = useTranslations("common");
  const locale = useLocale() as Locale;
  const isDeleted = type === "deleted";
  const { reservationSeenCount, reservationTrigger } = useNotificationContext();
  const previousReservationSeenCount = useRef(reservationSeenCount);
  const previousReservationTrigger = useRef(reservationTrigger);
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
    resetQueryAndFilters,
    refresh,
  } = useOwnerReservationList({
    pageSize: PAGE_SIZE,
    filters: { status: null, hasDeletedAt: isDeleted },
  });

  const preventToastRefresh = useRef<boolean>(false);

  useEffect(() => {
    const isPrevented = preventToastRefresh.current;
    preventToastRefresh.current = false;
    if (isDeleted || isPrevented) return;
    const seenCountChanged =
      previousReservationSeenCount.current !== reservationSeenCount;
    const reservationCountChanged =
      previousReservationTrigger.current !== reservationTrigger;

    previousReservationSeenCount.current = reservationSeenCount;

    if (reservationCountChanged) {
      if (currentTab !== "owner") return;

      previousReservationTrigger.current = reservationTrigger;
      toast.info(t("reservationListChanged"), {
        id: RESERVATION_UPDATE_TOAST_ID,
        description: t("reservationListChangedDescription"),
        duration: Infinity,
        action: {
          label: t("refreshReservations"),
          onClick: () => {
            refresh();
            toast.dismiss(RESERVATION_UPDATE_TOAST_ID);
          },
        },
      });
      return;
    }

    if (seenCountChanged) {
      refresh();
    }
  }, [
    currentTab,
    isDeleted,
    refresh,
    reservationSeenCount,
    reservationTrigger,
    t,
  ]);

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
      await runAsyncTask<void>({
        action: async () => {
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
                  {reservationT("requestDialogTitle", {
                    name: ownerName(owner),
                  })}
                </Text.FormTitle>
                <Text size="sm" color="muted-foreground">
                  {reservationT("requestDialogDescription")}
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
        },
        onError: (error) => {
          logger.error("OWNER-RESERVATIONS", "Failed to load request history", {
            error: error instanceof Error ? error.message : String(error),
            reservationId: owner.id,
          });
          toast.error("Couldn’t load the information requests", {
            description: "Please try again.",
          });
        },
      });
    },
    [modal, refresh, reservationT],
  );

  const handleRestoreOwner = useCallback(
    async (owner: OwnerReservationListItem) => {
      const restored = await runAsyncTask<boolean>({
        action: async () => {
          await restoreOwnerReservationAction(owner.id);
          refresh();
          toast.success(
            `${ownerName(owner) || "Owner registration"} restored`,
            {
              description:
                "The owner registration is back on the reservation forms page.",
            },
          );
          return true;
        },
        onError: (error) => {
          logger.error("OWNER-RESERVATIONS", "Failed to restore reservation", {
            error: error instanceof Error ? error.message : String(error),
            reservationId: owner.id,
          });
          toast.error("Couldn’t restore the owner registration", {
            description: "Please try again.",
          });
        },
      });

      return restored === true;
    },
    [refresh],
  );

  const onRestoreOwner = useCallback(
    (owner: OwnerReservationListItem) => {
      const name = ownerName(owner) || "owner registration";

      modal.open({
        className: "gap-0 w-fit",
        headerClassName: "border-b-0 px-4 pt-4 pb-3",
        header: (
          <Text.FormTitle size="base" weight="medium">
            Restore {name}?
          </Text.FormTitle>
        ),
        contentClassName: "px-4 pb-4",
        content: (
          <Text size="sm" color="muted-foreground">
            This owner registration will move back onto the reservation forms
            page.
          </Text>
        ),
        footer: ({ loading, close, run }) => (
          <>
            <Button variant="outline" disabled={loading} onClick={close}>
              {commonT("cancel")}
            </Button>
            <Button
              loading={loading}
              onClick={() =>
                void run(async () => {
                  if (await handleRestoreOwner(owner)) close();
                })
              }
            >
              {t("restoreAction")}
            </Button>
          </>
        ),
      });
    },
    [commonT, handleRestoreOwner, modal, t],
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
                  <span className="size-1.5 rounded-full bg-primary" />
                  {reservationT("new")}
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
        header: "Approved Cars (Not Finalized)",
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
            {isDeleted ? (
              <>
                <Button variant="ghost">
                  <Link href={`/app/cars/forms/owners/${row.original.id}`}>
                    <Eye className="size-3.5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestoreOwner(row.original)}
                >
                  <RotateCcw className="size-3.5" /> {t("restoreAction")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    isDeleted ||
                    row.original.status === "approved" ||
                    row.original.status === "requested"
                  }
                  onClick={() => void handleOwnerRequestInfo(row.original)}
                >
                  <Mail className="size-3.5" /> {reservationT("requestInfo")}
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/app/cars/forms/owners/${row.original.id}`}>
                    <SquarePen className="size-3.5" /> {reservationT("review")}
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={reservationT("downloadAria", {
                    name: ownerName(row.original),
                  })}
                  title={
                    row.original.status === "received" ||
                    row.original.status === "approved"
                      ? undefined
                      : reservationT("downloadDisabled")
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
              </>
            )}
          </div>
        ),
      },
    ],
    [
      handleOwnerDownload,
      handleOwnerRequestInfo,
      isDeleted,
      locale,
      onRestoreOwner,
      reservationT,
      t,
    ],
  );

  async function clearSubmissionForm() {
    const result = await runAsyncTask({
      action: clearOwnerReservationFormsAction,
      onError: (error) => {
        logger.error("OWNER-RESERVATIONS", "Failed to clear form data", {
          error: error instanceof Error ? error.message : String(error),
        });
        toast.error("Couldn’t clear car and reservation forms", {
          description: "Please try again.",
        });
      },
    });

    if (!result) return false;
    preventToastRefresh.current = true;
    toast.success("Forms cleared", {
      description:
        "All cars and owner registration entries moved to the delete history. You can restore them from there.",
    });

    refresh();
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

  const handleClearOwnerFilters = useCallback(() => {
    resetQueryAndFilters((current) => ({
      ...current,
      status: null,
    }));
  }, [resetQueryAndFilters]);

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
            ? "Post-approval paperwork for accepted cars: request, review and approve each owner's registration and every car's entry form & certificate. Changes save immediately — approving both unlocks “Finalize car”."
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
                  {reservationT("ownerRegistration")}
                </Text>
              </div>
            ),
            children: (
              <OwnerReservationTab
                key={locale}
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
                onClearFilters={handleClearOwnerFilters}
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
            disabled: true,
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
