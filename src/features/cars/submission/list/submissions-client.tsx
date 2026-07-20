"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import ClientSideDraggableTable from "@/src/components/ui/table/client-side-custom-table";
import { Link } from "@/src/i18n/navigation";
import { cn } from "@/src/lib/utils";
import { Download, Search, SquarePen, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  ColumnDef,
  OnChangeFn,
  SortingState,
} from "@tanstack/react-table";

import { SubmissionStatusBadge } from "../components/submission-ui";
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
import { SubmissionsTableSkeleton } from "./submissions-table-skeleton";
import { SUBMISSION_STATUS_LABELS } from "@/src/features/cars/submission/submission-types";
import { isSubmissionVehicleImage } from "@/src/features/cars/submission/submission-types";
import type {
  DbSubmissionStatus,
  SubmissionVehicleImage,
  SubmissionVehicleWithFormState,
} from "@/src/features/cars/submission/submission-types";
import Image from "next/image";
import { useDebounce } from "@/src/hooks/use-debounce";
import { Pagination } from "@/src/components/ui/pagination";
import useConfig from "@/src/features/config/hooks/useConfig";
import { downloadSubmissionForm } from "@/src/features/cars/submission/submission-download";

const PAGE_SIZE = 10;

const FILTERS: { value: "all" | DbSubmissionStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under review" },
  { value: "requested_info", label: "Request info" },
  { value: "info_received", label: "Info received" },
  { value: "waitlist", label: "Waitlist" },
  { value: "rejected", label: "Not selected" },
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

function RenderImage(images: unknown) {
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
    <div className="relative h-12 w-16 overflow-hidden rounded-md border bg-muted">
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

function activeSort(columnSorting: SortingState) {
  const [sort] = columnSorting;
  if (!sort) return { key: "updated" as const, descending: true };

  return {
    key: sort.id as CarSubmissionListSortKey,
    descending: sort.desc,
  };
}

export function SubmissionsClient() {
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

  const [columnSorting, setColumnSorting] = useState<SortingState>([
    { desc: true, id: "updated" },
  ]);
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await execute(getCarSubmissions, {
          page,
          pageSize: PAGE_SIZE,
          query: debounceQuery,
          sort: activeSort(columnSorting),
          status,
          isArchived: status === "archived",
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
        toast.error("Could not load car submissions");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [columnSorting, execute, page, debounceQuery, status]);

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

  const columns = useMemo<ColumnDef<SubmissionVehicleWithFormState, unknown>[]>(
    () => [
      {
        id: "image",
        header: "Image",
        enableSorting: false,
        cell: ({ row }) => {
          const submission = row.original;

          return (
            <Link
              href={`/app/cars/submissions/${submission.id}`}
              aria-label={`Review ${submissionVehicleName(submission)}`}
              className="block w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {RenderImage(submission.images as SubmissionVehicleImage[]) ?? (
                <div className="w-[62px] h-[46px]" />
              )}
            </Link>
          );
        },
      },
      {
        id: "owner",
        accessorFn: submissionOwnerName,
        header: "Owner",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-medium">
              {submissionOwnerName(row.original)}
            </span>
            {!isNewSubmission(row.original) ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                New
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "reference",
        accessorFn: (submission) => submission.carId,
        header: "Car ID",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.carId}
          </span>
        ),
      },
      {
        id: "vehicle",
        accessorFn: submissionVehicleName,
        header: "Vehicle",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-medium">
            {submissionVehicleName(row.original)}
          </span>
        ),
      },
      {
        id: "year",
        accessorFn: yearValue,
        header: "Year",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.yearOfManufacture}</span>
        ),
      },
      {
        id: "submitted",
        accessorFn: (submission) => submission.createdAt,
        header: "Submitted",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (submission) => SUBMISSION_STATUS_LABELS[submission.status],
        header: "Status",
        enableSorting: true,
        cell: ({ row }) => (
          <SubmissionStatusBadge status={row.original.status} />
        ),
      },
      {
        id: "updated",
        accessorFn: (submission) => submission.updatedAt,
        header: "Last update",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDate(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/cars/submissions/${row.original.id}`}>
                <SquarePen className="size-3.5" /> Review
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Download PDF for ${submissionVehicleName(row.original)}`}
              onClick={() =>
                Promise.all([
                  getCarSubmissionVehicle(row.original.id),
                  getCarSubmissionClasses(),
                ])
                  .then(([car, classes]) =>
                    downloadSubmissionForm(car, classes),
                  )
                  .catch((error) => {
                    console.log("error", error);
                    toast.error("Couldn’t prepare the download", {
                      description: "Please try again.",
                    });
                  })
              }
            >
              <Download className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const handleReorder = useCallback(() => {}, []);

  async function handleToggleSubmission(open: boolean) {
    await switchFeatureFlagConfig("carSubmission", open);
    toast.success(open ? "Car submissions opened" : "Car submissions closed");
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
            {nextOpen ? "Open car submissions?" : "Close car submissions?"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {nextOpen
              ? "The public submission form will become available immediately."
              : "The public form will be replaced with a submissions-closed message."}
          </p>
        </div>
      ),
      footer: ({ loading, close, run }) => (
        <>
          <Button variant="outline" onClick={modal.close}>
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={async () => {
              void run(() => handleToggleSubmission(nextOpen));
              close();
            }}
          >
            {nextOpen ? "Open submissions" : "Close submissions"}
          </Button>
        </>
      ),
    });
  }

  return (
    <>
      <PageHeader
        title="Car Submissions"
        description="Review incoming car submissions and move each one through the selection workflow. Review changes take effect when saved."
        viewport={["desktop", "mobile"]}
        titleAccessory={
          featureFlagCarSubmission ? (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              Form open
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              Submissions closed
            </Badge>
          )
        }
      />

      <div className="flex min-w-0 flex-col gap-6">
        <Card className="flex w-full min-w-0 flex-row items-center justify-between gap-5 p-5 shadow-none">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Accept new submissions</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {featureFlagCarSubmission
                ? "The public submission form is live and accepting cars."
                : "The form is hidden and the website displays a closed message."}
            </p>
          </div>
          <Switch
            checked={featureFlagCarSubmission}
            onCheckedChange={requestSubmissionToggle}
          />
        </Card>

        <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
          <div className="flex w-full min-w-0 items-center gap-5 overflow-scroll border-b lg:w-auto">
            {FILTERS.map((filter) => {
              const active = status === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (!active) {
                      setStatus(filter.value);
                      setPage(1);
                    }
                  }}
                  className={cn(
                    "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-0.5 pb-2.5 text-xs font-semibold uppercase transition-colors",
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
                    {counts[filter.value] ?? 0}
                  </span>
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="z-5 absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search submissions"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, car or reference"
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
            <X className="size-3.5" /> Clear filters
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
                  No submissions match the current filters.
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
