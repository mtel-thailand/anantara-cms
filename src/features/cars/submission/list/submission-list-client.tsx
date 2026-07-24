"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import ClientSideDraggableTable from "@/src/components/ui/table/client-side-custom-table";
import { Link, useRouter } from "@/src/i18n/navigation";
import { cn } from "@/src/lib/utils";
import {
  Download,
  Eye,
  History,
  RotateCcw,
  Search,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  ColumnDef,
  OnChangeFn,
  SortingState,
} from "@tanstack/react-table";

import { SubmissionStatusBadge } from "../components/submission-status-badge";
import { useModal } from "@/src/components/providers/modal-provider";
import { PageHeader } from "@/src/components/page-header";
import { formatDate } from "@/src/lib/date";
import { Switch } from "@/src/components/ui/switch";
import useAsync from "@/src/hooks/use-async";
import {
  type CarSubmissionListResult,
  getCarSubmissionClasses,
  getCarSubmissions,
  getCarSubmissionVehicle,
} from "@/src/features/cars/submission/api/submission.service";
import type { CarSubmissionListSortKey } from "@/src/features/cars/submission/api/submission.service";
import { logger } from "@/src/lib/logger";
import { SubmissionsTableSkeleton } from "./components/submission-list-skeleton";
import { SUBMISSION_STATUS_TRANSLATION_KEYS } from "@/src/features/cars/submission/submission.types";
import { isSubmissionVehicleImage } from "@/src/features/cars/submission/submission.types";
import type {
  DbSubmissionStatus,
  SubmissionVehicleImage,
  SubmissionVehicleWithFormState,
} from "@/src/features/cars/submission/submission.types";
import Image from "next/image";
import { useDebounce } from "@/src/hooks/use-debounce";
import { Pagination } from "@/src/components/ui/pagination";
import useConfig from "@/src/features/config/hooks/use-config";
import { downloadSubmissionForm } from "@/src/features/cars/submission/submission-download";
import type { Locale } from "@/src/types/locale";
import { useLocale, useTranslations } from "next-intl";
import Text from "@/src/components/ui/text";
import {
  clearSubmissionVehicle,
  restoreSubmissionVehicle,
} from "./submission-list.actions";
import { runAsyncTask } from "@/src/lib/async";
import NavigationButton from "@/src/components/navigation-button";

const PAGE_SIZE = 10;

const CLEARABLE_STATUSES = [
  "pending",
  "under_review",
  "requested_info",
  "info_received",
  "waitlist",
  "rejected",
] satisfies DbSubmissionStatus[];

const FILTERS: Array<"all" | DbSubmissionStatus> = [
  "all",
  ...CLEARABLE_STATUSES,
];

function yearValue(submission: SubmissionVehicleWithFormState) {
  const parsed = Number.parseInt(submission.yearOfManufacture, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function submissionOwnerName(submission: SubmissionVehicleWithFormState) {
  return `${submission.carSubmissionsForm.firstName} ${submission.carSubmissionsForm.name}`;
}

function submissionVehicleName(submission: SubmissionVehicleWithFormState) {
  return submission.makeOfVehicle;
}

function isNewSubmission(submission: SubmissionVehicleWithFormState) {
  return submission.seen;
}

function EmptyImage() {
  return (
    <div className="relative h-12 w-16 overflow-hidden rounded-md border bg-muted" />
  );
}

function RenderImage(images: unknown, deleted?: boolean) {
  if (!Array.isArray(images) || !images.length) {
    return <EmptyImage />;
  }

  const mainImage = images.find(
    (img): img is SubmissionVehicleImage =>
      isSubmissionVehicleImage(img) && img.seq === 1,
  );

  if (!mainImage) {
    return <EmptyImage />;
  }

  return (
    <div
      className={cn(
        "relative h-12 w-16 overflow-hidden rounded-md border bg-muted",
        { "opacity-60": deleted },
      )}
    >
      <Image
        src={mainImage.publicUrl}
        alt={mainImage.fileName}
        width={100}
        height={100}
      />
    </div>
  );
}

function createEmptyCounts() {
  return {
    all: 0,
  } satisfies CarSubmissionListResult["counts"];
}

function activeSort(columnSorting: SortingState, deleted: boolean) {
  const [sort] = columnSorting;
  if (!sort)
    return deleted
      ? { key: "deleted" as const, descending: true }
      : { key: "updated" as const, descending: true };

  return {
    key: sort.id as CarSubmissionListSortKey,
    descending: sort.desc,
  };
}

function ClearSubmissionConfirmation({
  clearSubmission,
}: {
  clearSubmission: () => Promise<boolean>;
}) {
  const modal = useModal();
  const t = useTranslations("cars.submission.list");
  const commonT = useTranslations("common");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const confirmed = value === "delete";

  async function handleClear() {
    if (!confirmed || loading) return;

    setLoading(true);

    try {
      if (await clearSubmission()) modal.close();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-2 p-4">
        <Text.FormTitle size="base" className="font-medium">
          {t("clearConfirmTitle")}
        </Text.FormTitle>
        <Text size="sm" color="muted-foreground">
          {t("clearConfirmDescription")}
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
        <Button variant="outline" disabled={loading} onClick={modal.close}>
          {commonT("cancel")}
        </Button>
        <Button
          loading={loading}
          disabled={loading || !confirmed}
          onClick={() => void handleClear()}
        >
          {t("clearAction")}
        </Button>
      </div>
    </>
  );
}

export function SubmissionsClient({ type }: { type?: "deleted" }) {
  const router = useRouter();
  const locale = useLocale() as Locale;
  const t = useTranslations("cars.submission.list");
  const commonT = useTranslations("common");
  const modal = useModal();
  const { isLoading, execute } = useAsync(true);
  const [submissions, setSubmissions] = useState<
    SubmissionVehicleWithFormState[]
  >([]);
  const { configStore, switchFeatureFlagConfig } = useConfig();
  const featureFlagCarSubmission: boolean = configStore
    ? (configStore?.config.featureFlags?.carSubmission ?? false)
    : false;

  const [total, setTotal] = useState(0);
  const [counts, setCounts] =
    useState<CarSubmissionListResult["counts"]>(createEmptyCounts);

  const [query, setQuery] = useState("");
  const debounceQuery = useDebounce<string>(query);

  const [status, setStatus] = useState<"all" | DbSubmissionStatus>("all");
  const [page, setPage] = useState(1);

  const [columnSorting, setColumnSorting] = useState<SortingState>([]);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await execute(getCarSubmissions, {
          page,
          pageSize: PAGE_SIZE,
          query: debounceQuery,
          sort: activeSort(columnSorting, type === "deleted"),
          status,
          hasArchivedAt: status === "archived",
          hasDeletedAt: type === "deleted",
        });

        if (cancelled) return;
        setSubmissions(result.data);
        setTotal(result.total);
        setCounts(result.counts);
      } catch (error) {
        if (cancelled) return;

        logger.error("CAR-SUBMISSIONS", "Failed to fetch submissions", {
          error: error instanceof Error ? error.message : String(error),
        });
        toast.error(t("loadError"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    columnSorting,
    debounceQuery,
    execute,
    page,
    refreshing,
    status,
    t,
    type,
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const handleColumnSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      setColumnSorting((current) =>
        typeof updater === "function" ? updater(current) : updater,
      );
      setPage(1);
    },
    [],
  );

  const handleRestoreSubmission = useCallback(
    async (vehicleId: string, name: string) => {
      await runAsyncTask<void>({
        action: () => {
          restoreSubmissionVehicle(vehicleId);
          toast.success(t("restoreSuccess", { name }), {
            description: t("restoreSuccessDescription"),
          });
        },
        onError: (error) => {
          logger.error("CAR-SUBMISSIONS", "Failed to restore submission", {
            error: error instanceof Error ? error.message : String(error),
            vehicleId,
          });
        },
        onFinally: () => setRefreshing((current) => !current),
      });
    },
    [t],
  );

  const onRestoreSubmission = useCallback(
    (vehicleData: SubmissionVehicleWithFormState) => {
      modal.open({
        className: "gap-0 w-fit",
        headerClassName: "border-b-0 px-4 pt-4 pb-3",
        header: (
          <Text.FormTitle size="base" weight="medium">
            {t("restoreTitle", { name: vehicleData.makeOfVehicle })}
          </Text.FormTitle>
        ),
        contentClassName: "px-4 pb-4",
        content: (
          <Text size="sm" color="muted-foreground">
            {t("restoreDescription")}
          </Text>
        ),
        footer: ({ loading, close, run }) => (
          <>
            <Button variant="outline" onClick={modal.close}>
              {commonT("cancel")}
            </Button>
            <Button
              loading={loading}
              onClick={async () => {
                void run(() =>
                  handleRestoreSubmission(
                    vehicleData.id,
                    vehicleData.makeOfVehicle,
                  ),
                );
                close();
              }}
            >
              {t("restoreAction")}
            </Button>
          </>
        ),
      });
    },
    [commonT, handleRestoreSubmission, modal, t],
  );

  const columns = useMemo<ColumnDef<SubmissionVehicleWithFormState, unknown>[]>(
    () => [
      {
        id: "image",
        header: t("image"),
        enableSorting: false,
        cell: ({ row }) => {
          const submission = row.original;

          return type !== "deleted" ? (
            <Link
              href={`/app/cars/submissions/${submission.id}`}
              aria-label={`${t("review")} ${submissionVehicleName(submission)}`}
              className="block w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {RenderImage(submission.images as SubmissionVehicleImage[]) ?? (
                <div className="w-[62px] h-[46px]" />
              )}
            </Link>
          ) : (
            <>
              {RenderImage(
                submission.images as SubmissionVehicleImage[],
                type === "deleted",
              ) ?? <div className="w-[62px] h-[46px]" />}
            </>
          );
        },
      },
      {
        id: "owner",
        accessorFn: submissionOwnerName,
        header: t("owner"),
        enableSorting: true,
        cell: ({ row }) => (
          <div
            className={cn("flex items-center gap-2 whitespace-nowrap", {
              "opacity-60": type === "deleted",
            })}
          >
            <span className="font-medium">
              {submissionOwnerName(row.original)}
            </span>
            {type !== "deleted" && !isNewSubmission(row.original) ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                {t("new")}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "reference",
        accessorFn: (submission) => submission.vehicleRef,
        header: t("vehicleRef"),
        enableSorting: true,
        cell: ({ row }) => (
          <span
            className={cn("font-mono text-xs text-muted-foreground", {
              "opacity-60": type === "deleted",
            })}
          >
            {row.original.vehicleRef}
          </span>
        ),
      },
      {
        id: "vehicle",
        accessorFn: submissionVehicleName,
        header: t("vehicle"),
        enableSorting: true,
        cell: ({ row }) => (
          <span
            className={cn("font-medium", { "opacity-60": type === "deleted" })}
          >
            {submissionVehicleName(row.original)}
          </span>
        ),
      },
      {
        id: "year",
        accessorFn: yearValue,
        header: t("year"),
        enableSorting: true,
        cell: ({ row }) => (
          <span
            className={cn("tabular-nums", { "opacity-60": type === "deleted" })}
          >
            {row.original.yearOfManufacture}
          </span>
        ),
      },
      {
        id: "submitted",
        accessorFn: (submission) => submission.createdAt,
        header: t("submitted"),
        enableSorting: true,
        cell: ({ row }) => (
          <span
            className={cn("whitespace-nowrap text-muted-foreground", {
              "opacity-60": type === "deleted",
            })}
          >
            {formatDate(row.original.createdAt, locale)}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (submission) =>
          t(SUBMISSION_STATUS_TRANSLATION_KEYS[submission.status]),
        header: t("status"),
        enableSorting: false,
        cell: ({ row }) => (
          <SubmissionStatusBadge
            status={row.original.status}
            className={cn({ "opacity-60": type === "deleted" })}
          />
        ),
      },
      type !== "deleted"
        ? {
            id: "updated",
            accessorFn: (submission) => submission.updatedAt,
            header: t("lastUpdate"),
            enableSorting: true,
            cell: ({ row }) => (
              <span
                className={cn("whitespace-nowrap text-muted-foreground", {
                  "opacity-60": type === "deleted",
                })}
              >
                {formatDate(row.original.updatedAt, locale)}
              </span>
            ),
          }
        : {
            id: "deleted",
            accessorFn: (submission) => submission.deletedAt,
            header: t("deleted"),
            enableSorting: true,
            cell: ({ row }) => (
              <span
                className={cn("whitespace-nowrap text-muted-foreground", {
                  "opacity-60": type === "deleted",
                })}
              >
                {formatDate(row.original.deletedAt, locale)}
              </span>
            ),
          },
      {
        id: "actions",
        header: t("action"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {type === "deleted" ? (
              <Button asChild variant="ghost" size="xs">
                <Link
                  href={`/app/cars/submissions/${row.original.id}`}
                  aria-label={t("viewDetailsAria", {
                    vehicle: row.original.makeOfVehicle,
                  })}
                >
                  <Eye className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={`/app/cars/submissions/${row.original.id}`}>
                  <SquarePen className="size-3.5" /> {t("review")}
                </Link>
              </Button>
            )}

            {type === "deleted" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRestoreSubmission(row.original)}
              >
                <RotateCcw className="size-3.5" /> {t("restoreAction")}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                aria-label={t("downloadAria", {
                  vehicle: submissionVehicleName(row.original),
                })}
                onClick={() =>
                  Promise.all([
                    getCarSubmissionVehicle(row.original.id),
                    getCarSubmissionClasses(),
                  ])
                    .then(([car, classes]) =>
                      downloadSubmissionForm(car, classes),
                    )
                    .catch(() => {
                      toast.error(t("downloadError"), {
                        description: t("tryAgain"),
                      });
                    })
                }
              >
                <Download className="size-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [locale, onRestoreSubmission, t, type],
  );

  const handleReorder = useCallback(() => {}, []);

  async function handleToggleSubmission(open: boolean) {
    await switchFeatureFlagConfig("carSubmission", open);
    toast.success(open ? t("openSuccess") : t("closeSuccess"));
    close();
  }

  function requestSubmissionToggle(nextOpen: boolean) {
    modal.preventBackdropClose();
    modal.open({
      className: "gap-0",
      headerClassName: "border-b-0 px-4",
      header: (
        <div className="pr-8">
          <h2 className="font-heading text-xl">
            {nextOpen ? t("openTitle") : t("closeTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {nextOpen ? t("openDescription") : t("closeDescription")}
          </p>
        </div>
      ),
      footer: ({ loading, close, run }) => (
        <>
          <Button variant="outline" onClick={modal.close}>
            {commonT("cancel")}
          </Button>
          <Button
            loading={loading}
            onClick={async () => {
              void run(() => handleToggleSubmission(nextOpen));
              close();
            }}
          >
            {nextOpen ? t("openAction") : t("closeAction")}
          </Button>
        </>
      ),
    });
  }

  async function clearSubmission() {
    const clearedCount = await runAsyncTask({
      action: () => clearSubmissionVehicle(CLEARABLE_STATUSES),
      onError: (error) => {
        logger.error("CAR-SUBMISSIONS", "Failed to clear submissions", {
          error: error instanceof Error ? error.message : String(error),
        });
        toast.error(t("clearError"));
      },
    });

    if (clearedCount === undefined) return false;

    toast.success(t("clearSuccess", { count: clearedCount }), {
      description: t("clearSuccessDescription"),
    });
    setRefreshing((current) => !current);
    return true;
  }

  function requestClearSubmission() {
    modal.handleHideShowCloseButton();
    modal.preventBackdropClose();
    modal.open({
      className: "gap-0",
      content: (
        <ClearSubmissionConfirmation
          clearSubmission={clearSubmission}
        />
      ),
    });
  }

  return (
    <>
      {type === "deleted" && (
        <NavigationButton
          text={t("backToSubmissions")}
          onClick={() => router.push("/app/cars/submissions")}
        />
      )}
      <PageHeader
        title={type !== "deleted" ? t("title") : t("deleteHistoryTitle")}
        description={
          type !== "deleted"
            ? t("description")
            : t("deleteHistoryDescription")
        }
        viewport={type !== "deleted" ? ["desktop", "mobile"] : undefined}
        titleAccessory={
          type !== "deleted" ? (
            featureFlagCarSubmission ? (
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                {t("formOpen")}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-muted text-muted-foreground"
              >
                {t("formClosed")}
              </Badge>
            )
          ) : (
            <Badge
              variant="outline"
              className="border-muted-foreground/30 bg-muted text-muted-foreground"
            >
              <Text
                size="xs"
                weight="medium"
                color="muted-foreground"
              >
                {t("deletedCount", { count: counts.all })}
              </Text>
            </Badge>
          )
        }
      >
        {type !== "deleted" && (
          <>
            <Button variant="ghost">
              <Link
                href="/app/cars/submissions/deleted"
                className="flex items-center gap-2"
              >
                <History className="size-4" />{" "}
                <Text size="sm">{t("deleteHistoryTitle")}</Text>
              </Link>
            </Button>
            <Button
              variant="outline"
              disabled={submissions.length === 0}
              onClick={requestClearSubmission}
            >
              <Trash2 className="size-4" />{" "}
              <Text size="sm">{t("clearData")}</Text>
            </Button>
          </>
        )}
      </PageHeader>

      <div className="flex min-w-0 flex-col gap-6">
        {type !== "deleted" && (
          <Card className="flex w-full min-w-0 flex-row items-center justify-between gap-5 p-5 shadow-none">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("acceptNew")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {featureFlagCarSubmission ? t("accepting") : t("notAccepting")}
              </p>
            </div>
            <Switch
              checked={featureFlagCarSubmission}
              onCheckedChange={requestSubmissionToggle}
            />
          </Card>
        )}

        <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
          <div className="flex w-full min-w-0 max-w-full touch-pan-x items-center gap-5 overflow-x-auto overflow-y-hidden overscroll-x-contain border-b [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:w-auto">
            {FILTERS.map((filter) => {
              const active = status === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (!active) {
                      setStatus(filter);
                      setPage(1);
                    }
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 border-b-2 px-0.5 pb-2.5 text-xs font-semibold uppercase transition-colors",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground cursor-pointer",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px] tabular-nums",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {counts[filter] ?? 0}
                  </span>
                  {filter === "all"
                    ? t("all")
                    : t(SUBMISSION_STATUS_TRANSLATION_KEYS[filter])}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="z-5 absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={t("searchAria")}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={t("search")}
              className="bg-card pl-9 truncate"
            />
          </div>
        </div>

        {query.trim() ? (
          <Button
            variant="ghost"
            size="sm"
            className="-mt-3 w-fit text-muted-foreground"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setPage(1);
            }}
          >
            <X className="size-3.5" /> {t("clearFilters")}
          </Button>
        ) : null}

        <Card className="w-full min-w-0 overflow-hidden rounded-lg shadow-none">
          {isLoading ? (
            <SubmissionsTableSkeleton rows={PAGE_SIZE} />
          ) : (
            <ClientSideDraggableTable<SubmissionVehicleWithFormState>
              data={submissions}
              columns={columns}
              columnSorting={columnSorting}
              onColumnSortingChange={handleColumnSortingChange}
              onReorder={handleReorder}
              className="max-h-none overflow-x-auto overflow-y-visible"
              tableClassName="min-w-[1050px] text-sm"
              headerClassName="bg-muted/35"
              bodyClassName="bg-card"
              enableColumnSorting={true}
              enabledRowSorting={false}
              emptyRow={
                <div className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                  {t("empty")}
                </div>
              }
            />
          )}
        </Card>

        <Pagination
          page={currentPage}
          pageCount={pageCount}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
