"use client";

import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import {
  CircleAlert,
  Download,
  Eye,
  Flag,
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
  clearCarAndReservationFormsAction,
  requestOwnerReservationInformationAction,
  restoreOwnerReservationAction,
} from "@/src/features/cars/reservation/list/owner-reservation-list.actions";
import { downloadOwnerReservation } from "@/src/features/cars/reservation/list/owner-reservation-download";
import {
  createRequestInfoModalStore,
  RequestInfoModal,
  RequestInfoModalFooter,
} from "@/src/features/cars/reservation/list/components/request-info-modal";
import { useNotificationContext } from "@/src/components/providers/notification-provider";
import Image from "next/image";
import CarEntryFormTab from "@/src/features/cars/reservation/list/components/car-entry-form-tab";
import { useCarEntryFormList } from "@/src/features/cars/reservation/list/hooks/use-car-entry-form-list";
import {
  CAR_ENTRY_FORM_STATUSES,
  type CarEntryFormFilter,
  type CarEntryFormListItem,
} from "@/src/features/cars/reservation/list/car-entry-form-list.types";
import { getCarEntryFormRequestDetail } from "@/src/features/cars/reservation/list/car-entry-form-list.service";
import {
  finalizeCarEntryFormVehicleAction,
  requestCarEntryFormInformationAction,
  restoreCarEntryFormVehicleAction,
} from "@/src/features/cars/reservation/list/car-entry-form-list.actions";
import { FORM_STATUS_BADGE } from "@/src/features/cars/reservation/list/components/form-status-stepper";
import { downloadCarEntryForm } from "@/src/features/cars/reservation/review/car-entry-form-download";
import { getCarEntryFormReview } from "@/src/features/cars/reservation/review/car-entry-form-review.service";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";

const PAGE_SIZE = 10;
const RESERVATION_UPDATE_TOAST_ID = "owner-reservation-list-update";
const CAR_FORM_UPDATE_TOAST_ID = "car-entry-form-list-update";
const DEFAULT_OWNER_COLUMN_VISIBILITY: VisibilityState = { deleted: false };
const DELETED_OWNER_COLUMN_VISIBILITY: VisibilityState = {
  approvedCars: false,
  updated: true,
  finalizedCars: false,
};

const OWNER_FILTER_VALUES = ["all", ...OWNER_RESERVATION_STATUSES] as const;
const CAR_FILTER_VALUES = ["all", ...CAR_ENTRY_FORM_STATUSES] as const;
const DEFAULT_CAR_COLUMN_VISIBILITY: VisibilityState = { deleted: false };
const DELETED_CAR_COLUMN_VISIBILITY: VisibilityState = {
  updated: false,
};
const DELETED_CAR_INITIAL_SORT = {
  key: "deleted",
  descending: true,
} as const;
const EMPTY_OWNER_ITEMS: OwnerReservationListItem[] = [];
const EMPTY_CAR_ITEMS: CarEntryFormListItem[] = [];

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
          {t("clearFormsConfirmTitle")}
        </Text.FormTitle>
        <Text size="sm" color="muted-foreground">
          {t("clearFormsConfirmDescription")}
        </Text>
        <Text size="sm" color="muted-foreground" className="pt-2">
          {t.rich("clearConfirmInstruction", {
            keyword: (chunks) => (
              <strong className="font-semibold text-black">{chunks}</strong>
            ),
          })}
        </Text>
        <Input
          aria-label={t("clearConfirmInputAria")}
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

export function ReservationFormListClient({
  initialTab = "owner",
  type,
}: {
  initialTab?: "owner" | "car";
  type?: "deleted";
}) {
  const router = useRouter();
  const t = useTranslations("cars.submission.list");
  const reservationT = useTranslations("cars.reservation.list");
  const commonT = useTranslations("common");
  const locale = useLocale() as Locale;
  const isDeleted = type === "deleted";
  const {
    carFormSeenCount,
    carFormTrigger,
    ownerReservationSeenCount,
    ownerReservationTrigger,
  } = useNotificationContext();
  const previousOwnerSeenCount = useRef(ownerReservationSeenCount);
  const previousOwnerTrigger = useRef(ownerReservationTrigger);
  const previousCarFormSeenCount = useRef(carFormSeenCount);
  const previousCarFormTrigger = useRef(carFormTrigger);
  const modal = useModal();
  const [currentTab, setCurrentTab] = useState<"owner" | "car">(initialTab);
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
  const {
    data: carData,
    total: carTotal,
    pageCount: carPageCount,
    page: carPage,
    isLoading: isCarLoading,
    query: carQuery,
    sortingState: carSortingState,
    filters: carFilters,
    setPage: setCarPage,
    setQuery: setCarQuery,
    setSortState: setCarSortState,
    setFilters: setCarFilters,
    resetQueryAndFilters: resetCarQueryAndFilters,
    refresh: refreshCars,
  } = useCarEntryFormList({
    pageSize: PAGE_SIZE,
    filters: { status: null, hasDeletedAt: isDeleted },
    initialSort: isDeleted ? DELETED_CAR_INITIAL_SORT : undefined,
  });
  const preventToastRefresh = useRef<boolean>(false);

  useEffect(() => {
    const isPrevented = preventToastRefresh.current;
    preventToastRefresh.current = false;
    if (isDeleted) return;
    const ownerSeenChanged =
      previousOwnerSeenCount.current !== ownerReservationSeenCount;
    const ownerCountChanged =
      previousOwnerTrigger.current !== ownerReservationTrigger;
    const carFormSeenChanged =
      previousCarFormSeenCount.current !== carFormSeenCount;
    const carFormCountChanged =
      previousCarFormTrigger.current !== carFormTrigger;

    if (isPrevented) {
      previousOwnerSeenCount.current = ownerReservationSeenCount;
      previousOwnerTrigger.current = ownerReservationTrigger;
      previousCarFormSeenCount.current = carFormSeenCount;
      previousCarFormTrigger.current = carFormTrigger;
      return;
    }

    if (currentTab === "owner") {
      previousOwnerSeenCount.current = ownerReservationSeenCount;
      previousOwnerTrigger.current = ownerReservationTrigger;

      if (!ownerCountChanged && ownerSeenChanged) {
        refresh();
        return;
      }
      if (!ownerCountChanged) return;

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

    previousCarFormSeenCount.current = carFormSeenCount;
    previousCarFormTrigger.current = carFormTrigger;

    if (!carFormCountChanged && carFormSeenChanged) {
      refreshCars();
      return;
    }
    if (carFormCountChanged) {
      toast.info(t("carFormListChanged"), {
        id: CAR_FORM_UPDATE_TOAST_ID,
        description: t("carFormListChangedDescription"),
        duration: Infinity,
        action: {
          label: t("refreshReservations"),
          onClick: () => {
            refreshCars();
            toast.dismiss(CAR_FORM_UPDATE_TOAST_ID);
          },
        },
      });
    }
  }, [
    carFormSeenCount,
    carFormTrigger,
    currentTab,
    isDeleted,
    ownerReservationSeenCount,
    ownerReservationTrigger,
    refresh,
    refreshCars,
    t,
  ]);

  const owners = data?.items ?? EMPTY_OWNER_ITEMS;
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
  const cars = carData?.items ?? EMPTY_CAR_ITEMS;
  const carFilterItems = useMemo(
    () =>
      CAR_FILTER_VALUES.map(
        (status): FilterToggleGroupItem<CarEntryFormFilter> => ({
          value: status,
          label: capitalize(status),
          count: carData?.statusCounts[status] ?? 0,
        }),
      ),
    [carData?.statusCounts],
  );

  const handleCarRequestInfo = useCallback(
    async (car: CarEntryFormListItem) => {
      await runAsyncTask<void>({
        action: async () => {
          const form = await getCarEntryFormRequestDetail(
            car.submissionVehicleId,
          );
          const requestInfoStore = createRequestInfoModalStore();
          const sendRequest = async (message: string) => {
            const result = await requestCarEntryFormInformationAction({
              message,
              submissionVehicleId: car.submissionVehicleId,
            });
            refreshCars();
            return result;
          };

          modal.handleShowShowCloseButton();
          modal.disableBackdropClose();
          modal.open({
            headerClassName: "border-b-0 px-4 !py-0 !pt-4",
            header: (
              <div className="pr-8">
                <Text.FormTitle size="xl">
                  {reservationT("carRequestDialogTitle", {
                    car: [car.make, car.model].filter(Boolean).join(" "),
                  })}
                </Text.FormTitle>
                <Text size="sm" color="muted-foreground">
                  {reservationT("carRequestDialogDescription")}
                </Text>
              </div>
            ),
            content: (
              <RequestInfoModal record={form} store={requestInfoStore} />
            ),
            footer: ({ loading, close, run }) => (
              <RequestInfoModalFooter
                close={close}
                loading={loading}
                onSend={sendRequest}
                record={form}
                requestKind="car"
                run={run}
                store={requestInfoStore}
              />
            ),
          });
        },
        onError: (error) => {
          logger.error("CAR-ENTRY-FORMS", "Failed to load request history", {
            error: error instanceof Error ? error.message : String(error),
            submissionVehicleId: car.submissionVehicleId,
          });
          toast.error(reservationT("requestLoadError"), {
            description: reservationT("tryAgain"),
          });
        },
      });
    },
    [modal, refreshCars, reservationT],
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
        toast.error(reservationT("downloadError"), {
          description: reservationT("tryAgain"),
        });
      }
    },
    [reservationT],
  );

  const handleCarDownload = useCallback(
    async (car: CarEntryFormListItem) => {
      try {
        await downloadCarEntryForm(
          await getCarEntryFormReview(car.submissionVehicleId),
          {
            make: car.make,
            model: car.model,
            ownerName: [car.ownerForenames, car.ownerSurname]
              .filter(Boolean)
              .join(" "),
            vehicleRef: car.vehicleRef,
          },
        );
      } catch (error) {
        logger.error("CAR-ENTRY-FORMS", "Failed to download car entry form", {
          error: error instanceof Error ? error.message : String(error),
          submissionVehicleId: car.submissionVehicleId,
        });
        toast.error(reservationT("downloadError"), {
          description: reservationT("tryAgain"),
        });
      }
    },
    [reservationT],
  );

  const handleOwnerRequestInfo = useCallback(
    async (owner: OwnerReservationListItem) => {
      await runAsyncTask<void>({
        action: async () => {
          const reservation = await getOwnerReservation(owner.id);
          const requestInfoStore = createRequestInfoModalStore();
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
              <RequestInfoModal record={reservation} store={requestInfoStore} />
            ),
            footer: ({ loading, close, run }) => (
              <RequestInfoModalFooter
                close={close}
                loading={loading}
                onSend={sendRequest}
                record={reservation}
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
          toast.error(reservationT("requestLoadError"), {
            description: reservationT("tryAgain"),
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
            reservationT("ownerRestored", {
              name: ownerName(owner) || reservationT("ownerRegistration"),
            }),
            {
              description: reservationT("ownerRestoredDescription"),
            },
          );
          return true;
        },
        onError: (error) => {
          logger.error("OWNER-RESERVATIONS", "Failed to restore reservation", {
            error: error instanceof Error ? error.message : String(error),
            reservationId: owner.id,
          });
          toast.error(reservationT("restoreOwnerError"), {
            description: reservationT("tryAgain"),
          });
        },
      });

      return restored === true;
    },
    [refresh, reservationT],
  );

  const onRestoreOwner = useCallback(
    (owner: OwnerReservationListItem) => {
      const name = ownerName(owner) || reservationT("ownerRegistration");

      modal.open({
        className: "gap-0 w-fit",
        headerClassName: "border-b-0 px-4 pt-4 pb-3",
        header: (
          <Text.FormTitle size="base" weight="medium">
            {reservationT("restoreOwnerTitle", { name })}
          </Text.FormTitle>
        ),
        contentClassName: "px-4 pb-4",
        content: (
          <Text size="sm" color="muted-foreground">
            {reservationT("restoreOwnerDescription")}
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
    [commonT, handleRestoreOwner, modal, reservationT, t],
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
              {!isDeleted && row.original.hasCarsMovedBackToPreApproval ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex shrink-0 text-amber-500 focus-visible:outline-none"
                        tabIndex={0}
                        aria-label={reservationT("carsMovedBackToPreApproval")}
                      >
                        <CircleAlert className="size-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {reservationT("carsMovedBackToPreApproval")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
              {!isDeleted && !row.original.seen ? (
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
            {row.original.deletedAt
              ? formatDate(row.original.deletedAt, locale)
              : "—"}
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

  const carColumns = useMemo<ColumnDef<CarEntryFormListItem, unknown>[]>(
    () => [
      {
        id: "image",
        accessorKey: "imageUrl",
        header: reservationT("image"),
        enableSorting: false,
        cell: ({ row }) => {
          return row.original.imageUrl ? (
            <Link href={`/app/cars/forms/${row.original.submissionVehicleId}`}>
              <Image
                src={row.original.imageUrl}
                alt={[row.original.make, row.original.model]
                  .filter(Boolean)
                  .join(" ")}
                width={48}
                height={48}
                className={cn("size-12 rounded-md object-cover", {
                  "opacity-60": isDeleted,
                })}
              />
            </Link>
          ) : (
            <div className="size-12 rounded-md bg-muted" />
          );
        },
      },
      {
        id: "name",
        accessorFn: (car) =>
          [car.ownerForenames, car.ownerSurname].filter(Boolean).join(" "),
        header: reservationT("owner"),
        enableSorting: true,
        cell: ({ row }) => (
          <div
            className={cn("flex min-w-48 flex-col", {
              "opacity-60": isDeleted,
            })}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {[row.original.ownerForenames, row.original.ownerSurname]
                  .filter(Boolean)
                  .join(" ")}
              </span>
              {!isDeleted && !row.original.seen ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {reservationT("new")}
                </span>
              ) : null}
            </div>
            <span className="text-xs text-muted-foreground">
              {[row.original.make, row.original.model]
                .filter(Boolean)
                .join(" ")}
            </span>
          </div>
        ),
      },
      {
        id: "reference",
        accessorKey: "vehicleRef",
        header: reservationT("reference"),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.vehicleRef || "—"}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: reservationT("formStatus"),
        enableSorting: true,
        cell: ({ row }) => (
          <div className={cn({ "opacity-60": isDeleted })}>
            <FormStatusChip status={row.original.status} />
          </div>
        ),
      },
      {
        id: "photos",
        accessorFn: (car) => car.highResolutionPhotosLink ?? "",
        header: reservationT("highQualityImageLink"),
        enableSorting: true,
        sortDescFirst: false,
        cell: ({ row }) => {
          const formSubmitted =
            row.original.status === "received" ||
            row.original.status === "approved";
          const received =
            formSubmitted &&
            Boolean(row.original.highResolutionPhotosLink?.trim());
          const photoStatus = received ? "received" : "required";
          return (
            <Badge
              variant="outline"
              className={cn(
                FORM_STATUS_BADGE[photoStatus],
                "whitespace-nowrap",
              )}
            >
              {reservationT(
                received ? "photoLinkReceived" : "photoLinkRequired",
              )}
            </Badge>
          );
        },
      },
      {
        id: "updated",
        accessorKey: "updatedAt",
        header: reservationT("lastUpdated"),
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
        header: reservationT("deleted"),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground opacity-60">
            {row.original.deletedAt
              ? formatDate(row.original.deletedAt, locale)
              : "—"}
          </span>
        ),
      },
      {
        id: "action",
        header: reservationT("action"),
        enableSorting: false,
        cell: ({ row }) =>
          isDeleted ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="icon-sm">
                <Link
                  href={`/app/cars/forms/${row.original.submissionVehicleId}`}
                >
                  <Eye className="size-3.5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const car = row.original;
                  modal.open({
                    headerClassName: "border-0 px-4 pt-4",
                    header: (
                      <Text.FormTitle size="base">
                        {reservationT("restoreCarTitle", {
                          car: [car.make, car.model].filter(Boolean).join(" "),
                        })}
                      </Text.FormTitle>
                    ),
                    contentClassName: "px-4",
                    content: (
                      <Text size="sm" color="muted-foreground">
                        {reservationT("restoreCarDescription")}
                      </Text>
                    ),
                    footer: ({ loading, close, run }) => (
                      <>
                        <Button
                          variant="outline"
                          disabled={loading}
                          onClick={close}
                        >
                          {commonT("cancel")}
                        </Button>
                        <Button
                          loading={loading}
                          onClick={() =>
                            void run(async () => {
                              try {
                                await restoreCarEntryFormVehicleAction(
                                  car.submissionVehicleId,
                                );
                                refreshCars();
                                close();
                                toast.success(reservationT("carRestored"));
                              } catch (error) {
                                logger.error(
                                  "CAR-ENTRY-FORMS",
                                  "Failed to restore car entry form",
                                  {
                                    error:
                                      error instanceof Error
                                        ? error.message
                                        : String(error),
                                    submissionVehicleId:
                                      car.submissionVehicleId,
                                  },
                                );
                                toast.error(reservationT("restoreCarError"), {
                                  description: reservationT("tryAgain"),
                                });
                              }
                            })
                          }
                        >
                          <RotateCcw className="size-3.5" />{" "}
                          {t("restoreAction")}
                        </Button>
                      </>
                    ),
                  });
                }}
              >
                <RotateCcw className="size-3.5" /> {t("restoreAction")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Button
                variant="outline"
                size="sm"
                disabled={
                  row.original.status === "approved" ||
                  row.original.status === "requested"
                }
                onClick={() => void handleCarRequestInfo(row.original)}
              >
                <Mail className="size-3.5" /> {reservationT("requestInfo")}
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/app/cars/forms/${row.original.submissionVehicleId}`}
                >
                  <SquarePen className="size-3.5" /> {reservationT("review")}
                </Link>
              </Button>
              <Button
                size="sm"
                disabled={!row.original.canFinalize}
                title={
                  !row.original.canFinalize
                    ? reservationT("finalizeUnavailable")
                    : undefined
                }
                onClick={() => {
                  const car = row.original;
                  modal.open({
                    headerClassName: "border-0 px-4 py-0 pt-4",
                    header: (
                      <Text.FormTitle size="base">
                        {reservationT("finalizeTitle", {
                          car: [car.make, car.model].filter(Boolean).join(" "),
                        })}
                      </Text.FormTitle>
                    ),
                    contentClassName: "px-4",
                    content: (
                      <Text size="sm" color="muted-foreground">
                        {reservationT("finalizeDescription")}
                      </Text>
                    ),
                    footer: ({ loading, close, run }) => (
                      <>
                        <Button
                          variant="outline"
                          disabled={loading}
                          onClick={close}
                        >
                          {commonT("cancel")}
                        </Button>
                        <Button
                          loading={loading}
                          onClick={() =>
                            void run(async () => {
                              try {
                                preventToastRefresh.current = true;
                                await finalizeCarEntryFormVehicleAction(
                                  car.submissionVehicleId,
                                );
                                refreshCars();
                                close();
                                toast.success(
                                  reservationT("finalized", {
                                    car: [car.make, car.model]
                                      .filter(Boolean)
                                      .join(" "),
                                  }),
                                  {
                                    description: reservationT(
                                      "finalizedDescription",
                                    ),
                                  },
                                );
                              } catch (error) {
                                preventToastRefresh.current = false;
                                logger.error(
                                  "CAR-ENTRY-FORMS",
                                  "Failed to finalize car",
                                  {
                                    error:
                                      error instanceof Error
                                        ? error.message
                                        : String(error),
                                    submissionVehicleId:
                                      car.submissionVehicleId,
                                  },
                                );
                                toast.error(reservationT("finalizeError"), {
                                  description: reservationT("tryAgain"),
                                });
                              }
                            })
                          }
                        >
                          {reservationT("finalizeCar")}
                        </Button>
                      </>
                    ),
                  });
                }}
              >
                <Flag className="size-3.5" /> {reservationT("finalizeCar")}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                aria-label={reservationT("carDownloadAria", {
                  vehicle: [row.original.make, row.original.model]
                    .filter(Boolean)
                    .join(" "),
                })}
                disabled={
                  row.original.status !== "received" &&
                  row.original.status !== "approved"
                }
                title={
                  row.original.status === "received" ||
                  row.original.status === "approved"
                    ? undefined
                    : reservationT("carDownloadDisabled")
                }
                onClick={() => void handleCarDownload(row.original)}
              >
                <Download className="size-4" />
              </Button>
            </div>
          ),
      },
    ],
    [
      commonT,
      handleCarDownload,
      handleCarRequestInfo,
      isDeleted,
      locale,
      modal,
      refreshCars,
      reservationT,
      t,
    ],
  );

  async function clearSubmissionForm() {
    const result = await runAsyncTask({
      action: clearCarAndReservationFormsAction,
      onError: (error) => {
        logger.error("OWNER-RESERVATIONS", "Failed to clear form data", {
          error: error instanceof Error ? error.message : String(error),
        });
        toast.error(t("clearFormsError"), {
          description: t("tryAgain"),
        });
      },
    });

    if (!result) return false;
    preventToastRefresh.current = true;
    toast.success(t("clearFormsSuccess"), {
      description: t("clearFormsSuccessDescription"),
    });

    setPage(1);
    setCarPage(1);
    refresh();
    refreshCars();
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

  const handleCarFilterChange = useCallback(
    (filter: CarEntryFormFilter) => {
      setCarFilters((current) => ({
        ...current,
        status: filter === "all" ? null : filter,
      }));
    },
    [setCarFilters],
  );

  const handleClearCarFilters = useCallback(() => {
    resetCarQueryAndFilters((current) => ({ ...current, status: null }));
  }, [resetCarQueryAndFilters]);

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
              disabled={
                owners.length === 0 ||
                isLoading ||
                cars.length === 0 ||
                isCarLoading
              }
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
            label: (
              <div className="flex items-center gap-1.5">
                <CountBadge count={carTotal} />
                <Text size="xs" color="primary">
                  {reservationT("carForms")}
                </Text>
              </div>
            ),
            children: (
              <CarEntryFormTab
                key={locale}
                data={cars}
                filterItems={carFilterItems}
                columns={carColumns}
                columnVisibility={
                  isDeleted
                    ? DELETED_CAR_COLUMN_VISIBILITY
                    : DEFAULT_CAR_COLUMN_VISIBILITY
                }
                sortingState={carSortingState}
                onColumnSortingChange={setCarSortState}
                onClearFilters={handleClearCarFilters}
                onFilterChange={handleCarFilterChange}
                onPageChange={setCarPage}
                onQueryChange={setCarQuery}
                page={carPage}
                pageCount={carPageCount}
                query={carQuery}
                total={carTotal}
                isLoading={isCarLoading}
                currentFilter={carFilters.status ?? "all"}
              />
            ),
          },
        ]}
        setValue={setCurrentTab}
      />
    </div>
  );
}
