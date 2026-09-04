"use client";

import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  Archive,
  CircleAlert,
  Download,
  Pencil,
  Search,
  Save,
  Undo2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/src/components/page-header";
import { useLayoutContext } from "@/src/components/providers/app-layout";
import { useModal } from "@/src/components/providers/modal-provider";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { LanguageChips } from "@/src/components/ui/language-chips";
import { Pagination } from "@/src/components/ui/pagination";
import { PrivateCollectionWarning } from "@/src/components/ui/private-collection-warning";
import { Skeleton } from "@/src/components/ui/skeleton";
import Text from "@/src/components/ui/text";
import { Dropdown } from "@/src/components/ui/dropdown/dropdown";
import ClientSideDraggableTable from "@/src/components/ui/table/client-side-custom-table";
import { GenericTooltip } from "@/src/components/ui/tooltip";
import {
  archiveFinalizedCarsAction,
  publishFinalizedCarDraftAction,
} from "@/src/features/cars/finalized/finalized-cars.actions";
import { ArchiveFinalizedCarsConfirmation } from "@/src/features/cars/finalized/components/archive-finalized-cars-confirmation";
import { FinalizedCarDetails } from "@/src/features/cars/finalized/components/finalized-car-details";
import {
  getFinalizedCarOwnerReservationId,
  getFinalizedCarsPage,
} from "@/src/features/cars/finalized/finalized-cars.service";
import type {
  FinalizedCarListItem,
  FinalizedCarClassFilter,
  FinalizedCarDraft,
  FinalizedCarsData,
  FinalizedCarStatus,
} from "@/src/features/cars/finalized/finalized-cars.types";
import { downloadFinalizedCarForms } from "@/src/features/cars/finalized/finalized-car-download";
import { uploadCarSubmissionFiles } from "@/src/features/cars/submission/api/submission.service";
import { romanNumeral } from "@/src/features/cars/car-class-number.helpers";
import useAsync from "@/src/hooks/use-async";
import { useDebounce } from "@/src/hooks/use-debounce";
import { formatDate } from "@/src/lib/date";
import { logger } from "@/src/lib/logger";
import { cn } from "@/src/lib/utils";
import type { Locale } from "@/src/types/locale";

const PAGE_SIZE = 10;
const FINALIZED_CAR_DRAFTS_STORAGE_KEY = "anantara-cms:finalized-car-drafts:v1";
const FINALIZED_CAR_DRAFTS_STORAGE_VERSION = 1;
const EMPTY_DATA: FinalizedCarsData = {
  classes: [],
  counts: { archived: 0, finalized: 0 },
  items: [],
  total: 0,
};
const ignoreReorder = () => {};
const FINALIZED_STATUS_CLASSES: Record<FinalizedCarStatus, string> = {
  finalized: "border-indigo-200 bg-indigo-50 text-indigo-700",
  archived: "border-zinc-300 bg-zinc-100 text-zinc-600",
};

function carName(car: FinalizedCarListItem) {
  return [car.make, car.model].filter(Boolean).join(" ");
}

function ownerName(car: FinalizedCarListItem) {
  return [car.ownerFirstName, car.ownerLastName].filter(Boolean).join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function storedFinalizedCarDrafts(value: unknown) {
  if (
    !isRecord(value) ||
    value.version !== FINALIZED_CAR_DRAFTS_STORAGE_VERSION
  ) {
    return null;
  }
  if (!isRecord(value.drafts)) return null;

  const drafts: Record<string, FinalizedCarDraft> = {};
  for (const [id, draft] of Object.entries(value.drafts)) {
    if (
      !isRecord(draft) ||
      typeof draft.expectedUpdatedAt !== "string" ||
      typeof draft.formId !== "string" ||
      typeof draft.submissionId !== "string" ||
      typeof draft.stagedStatus !== "string" ||
      !isRecord(draft.values)
    ) {
      return null;
    }

    drafts[id] = {
      ...(draft as Omit<FinalizedCarDraft, "imageFiles">),
      imageFiles: [],
    };
  }

  return drafts;
}

function serializableFinalizedCarDrafts(
  drafts: Record<string, FinalizedCarDraft>,
) {
  return Object.fromEntries(
    Object.entries(drafts).map(([id, draft]) => [
      id,
      {
        ...draft,
        imageFiles: [],
        values: {
          ...draft.values,
          documentFiles: [],
          images: draft.values.images.filter(
            (image) => !image.url.startsWith("blob:"),
          ),
        },
      },
    ]),
  );
}

function applyDraftToListItem(
  car: FinalizedCarListItem,
  draft: FinalizedCarDraft | undefined,
) {
  if (!draft) return car;

  const { values } = draft;
  return {
    ...car,
    descriptionEn: values.history.en,
    descriptionIt: values.history.it,
    imageUrl: values.images[0]?.url ?? "",
    make: values.vehicle.make,
    model: values.vehicle.model,
    ownerEmail: values.owner.email,
    ownerFirstName: values.owner.firstName,
    ownerLastName: values.owner.lastName,
    year: values.year,
  };
}

function FinalizedCarsSkeleton() {
  return (
    <Card className="space-y-2 p-3 shadow-none">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </Card>
  );
}

export function FinalizedCarsClient() {
  const t = useTranslations("cars.finalized");
  const commonT = useTranslations("common");
  const locale = useLocale() as Locale;
  const modal = useModal();
  const { handleCloseOverlay, handleOpenOverlay, setOverlayPage } =
    useLayoutContext();
  const { isLoading, execute } = useAsync(true);
  const [data, setData] = useState<FinalizedCarsData>(EMPTY_DATA);
  const [tab, setTab] = useState<FinalizedCarStatus>("finalized");
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] =
    useState<FinalizedCarClassFilter>("all");
  const debouncedQuery = useDebounce(query).trim();
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const requestKey = `${tab}:${classFilter}:${page}:${debouncedQuery}:${JSON.stringify(sorting)}`;
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const activeRequestKeyRef = useRef(requestKey);
  const [drafts, setDrafts] = useState<Record<string, FinalizedCarDraft>>({});
  const [draftStorageHydrated, setDraftStorageHydrated] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const detailsInstanceRef = useRef(0);
  const overlayDirtyRef = useRef(false);
  const hasDrafts = Object.keys(drafts).length > 0;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        FINALIZED_CAR_DRAFTS_STORAGE_KEY,
      );
      if (!stored) return;

      const restoredDrafts = storedFinalizedCarDrafts(JSON.parse(stored));
      if (!restoredDrafts) {
        window.localStorage.removeItem(FINALIZED_CAR_DRAFTS_STORAGE_KEY);
        return;
      }
      setDrafts(restoredDrafts);
    } catch (error) {
      logger.warn("FINALIZED-CARS", "Failed to restore local car drafts", {
        error: error instanceof Error ? error.message : String(error),
      });
      window.localStorage.removeItem(FINALIZED_CAR_DRAFTS_STORAGE_KEY);
    } finally {
      setDraftStorageHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!draftStorageHydrated) return;

    if (!Object.keys(drafts).length) {
      window.localStorage.removeItem(FINALIZED_CAR_DRAFTS_STORAGE_KEY);
      return;
    }

    try {
      window.localStorage.setItem(
        FINALIZED_CAR_DRAFTS_STORAGE_KEY,
        JSON.stringify({
          drafts: serializableFinalizedCarDrafts(drafts),
          version: FINALIZED_CAR_DRAFTS_STORAGE_VERSION,
        }),
      );
    } catch (error) {
      logger.warn("FINALIZED-CARS", "Failed to persist local car drafts", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [draftStorageHydrated, drafts]);

  const load = useCallback(async () => {
    activeRequestKeyRef.current = requestKey;
    try {
      const [activeSort] = sorting;
      const result = await execute(getFinalizedCarsPage, {
        classFilter,
        page,
        pageSize: PAGE_SIZE,
        query: debouncedQuery,
        sort: activeSort
          ? {
              key: activeSort.id as "name" | "owner" | "updated" | "year",
              descending: activeSort.desc,
            }
          : { key: "updated", descending: true },
        status: tab,
      });
      if (result && activeRequestKeyRef.current === requestKey) setData(result);
    } catch (error) {
      if (activeRequestKeyRef.current !== requestKey) return;
      logger.error("FINALIZED-CARS", "Failed to load finalized cars", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error(t("loadError"), { description: t("tryAgain") });
    } finally {
      if (activeRequestKeyRef.current === requestKey) {
        setLoadedRequestKey(requestKey);
      }
    }
  }, [classFilter, debouncedQuery, execute, page, requestKey, sorting, t, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = data.counts;
  const pageCount = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => data.items.map((car) => applyDraftToListItem(car, drafts[car.id])),
    [data.items, drafts],
  );
  const showTableLoading =
    isLoading ||
    loadedRequestKey !== requestKey ||
    query.trim() !== debouncedQuery;

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const requestCloseOverlay = useCallback(() => {
    if (!overlayDirtyRef.current) {
      handleCloseOverlay();
      return;
    }

    modal.preventBackdropClose();
    modal.open({
      className: "gap-1.5",
      headerClassName: "border-0 px-4 py-0 pt-4",
      header: (
        <Text.FormTitle size="base" className="font-medium">
          {t("overlayDiscardTitle")}
        </Text.FormTitle>
      ),
      contentClassName: "px-4 pb-2 gap-0",
      content: (
        <Text size="sm" color="muted-foreground">
          {t("overlayDiscardDescription")}
        </Text>
      ),
      footer: (
        <>
          <Button variant="outline" onClick={modal.close}>
            {commonT("keepEditing")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              overlayDirtyRef.current = false;
              handleCloseOverlay();
              modal.close();
            }}
          >
            {t("discardChanges")}
          </Button>
        </>
      ),
    });
  }, [commonT, handleCloseOverlay, modal, t]);

  const openDetails = useCallback(
    async (car: FinalizedCarListItem, initialEditLocale?: Locale) => {
      let ownerReservationId = car.ownerReservationId;
      if (!ownerReservationId) {
        try {
          ownerReservationId = await getFinalizedCarOwnerReservationId(car.id);
        } catch (error) {
          logger.error(
            "FINALIZED-CARS",
            "Failed to resolve the finalized car owner registration",
            {
              error: error instanceof Error ? error.message : String(error),
              submissionVehicleId: car.id,
            },
          );
        }
      }

      overlayDirtyRef.current = false;
      detailsInstanceRef.current += 1;
      setOverlayPage({
        content: (
          <FinalizedCarDetails
            key={`${car.id}-${detailsInstanceRef.current}`}
            car={{ ...car, ownerReservationId }}
            draft={drafts[car.id]}
            initialEditLocale={initialEditLocale}
            onClose={requestCloseOverlay}
            onDirtyChange={(dirty) => {
              overlayDirtyRef.current = dirty;
            }}
            onStageDraft={(nextDraft) => {
              setDrafts((current) => ({
                ...current,
                [car.id]: nextDraft,
              }));
            }}
          />
        ),
        panelClassName: "w-full max-w-3xl p-0",
        contentClassName: "px-0 pb-0",
        onClose: requestCloseOverlay,
      });
      handleOpenOverlay();
    },
    [drafts, handleOpenOverlay, requestCloseOverlay, setOverlayPage],
  );

  const handleDownload = useCallback(
    async (car: FinalizedCarListItem) => {
      try {
        await downloadFinalizedCarForms(car.id, car.categoryId);
      } catch (error) {
        logger.error(
          "FINALIZED-CARS",
          "Failed to download finalized car forms",
          {
            error: error instanceof Error ? error.message : String(error),
            submissionVehicleId: car.id,
          },
        );
        toast.error(t("downloadError"), { description: t("tryAgain") });
      }
    },
    [t],
  );

  const columns = useMemo<ColumnDef<FinalizedCarListItem, unknown>[]>(
    () => [
      {
        id: "image",
        header: t("image"),
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            aria-label={t("openDetailsAria", { car: carName(row.original) })}
            onClick={() => void openDetails(row.original)}
          >
            <span className="relative block h-12 w-16 overflow-hidden rounded-md border bg-muted">
              {row.original.imageUrl ? (
                <Image
                  src={row.original.imageUrl}
                  alt={carName(row.original)}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : null}
            </span>
          </button>
        ),
      },
      {
        id: "class",
        accessorKey: "classSequence",
        header: t("class"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.classSequence === null ? (
            <span className="text-muted-foreground">{t("unassigned")}</span>
          ) : (
            <div className="flex flex-col">
              <span className="font-medium">
                {t("classNumber", {
                  number: romanNumeral(row.original.classSequence),
                })}
              </span>
              <span className="text-xs text-muted-foreground">
                {row.original.className}
              </span>
            </div>
          ),
      },
      {
        id: "name",
        accessorFn: carName,
        header: t("carName"),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-medium">{carName(row.original)}</span>
        ),
      },
      {
        id: "year",
        accessorKey: "year",
        header: t("year"),
        enableSorting: true,
      },
      {
        id: "owner",
        accessorFn: ownerName,
        header: t("owner"),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span>{ownerName(row.original)}</span>
              {row.original.ownerFormNeedsAttention ? (
                <GenericTooltip
                  trigger={
                    <span
                      className="inline-flex w-fit focus-visible:outline-none"
                      tabIndex={0}
                    >
                      <CircleAlert className="size-4 text-amber-500" />
                    </span>
                  }
                  content={t("ownerAttention")}
                />
              ) : null}
            </div>
            {row.original.hideOwnerName ? (
              <PrivateCollectionWarning
                label={t("privateCollection")}
                hint={t("privateCollectionHint")}
              />
            ) : null}
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: t("statusLabel"),
        enableSorting: false,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={FINALIZED_STATUS_CLASSES[row.original.status]}
          >
            {t(`status.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        id: "updated",
        accessorKey: "updatedAt",
        header: t("lastUpdated"),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDate(row.original.updatedAt, locale)}
          </span>
        ),
      },
      {
        id: "languages",
        header: t("languages"),
        enableSorting: false,
        cell: ({ row }) => (
          <LanguageChips
            availability={{
              en: Boolean(row.original.descriptionEn.trim()),
              it: Boolean(row.original.descriptionIt.trim()),
            }}
          />
        ),
      },
      {
        id: "action",
        header: t("action"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
            {drafts[row.original.id] ? (
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 text-primary"
              >
                {t("draft")}
              </Badge>
            ) : null}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("openDetailsAria", { car: carName(row.original) })}
              onClick={() => void openDetails(row.original)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("downloadAria", { car: carName(row.original) })}
              onClick={() => void handleDownload(row.original)}
            >
              <Download className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [drafts, handleDownload, locale, openDetails, t],
  );

  async function archiveCars() {
    try {
      const count = await archiveFinalizedCarsAction();
      await load();
      setTab("archived");
      setPage(1);
      toast.success(t("archiveSuccess"), {
        description: t("archiveSuccessDescription", { count }),
      });
      return true;
    } catch (error) {
      logger.error("FINALIZED-CARS", "Failed to archive finalized cars", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error(t("archiveError"), { description: t("tryAgain") });
      return false;
    }
  }

  function discardDrafts() {
    Object.values(drafts).forEach((draft) => {
      draft.values.images.forEach((image) => {
        if (image.url.startsWith("blob:")) URL.revokeObjectURL(image.url);
      });
    });
    setDrafts({});
    toast.success(t("changesDiscarded"));
  }

  async function publishDrafts() {
    if (!hasDrafts || isPublishing) return false;

    setIsPublishing(true);
    try {
      for (const [id, draft] of Object.entries(drafts)) {
        const filesById = new Map(draft.imageFiles);
        const imageFiles = draft.values.images.flatMap((image) => {
          const file = filesById.get(image.id);
          return file ? [file] : [];
        });
        const uploads = await uploadCarSubmissionFiles(
          {
            documents: draft.values.documentFiles,
            images: imageFiles,
          },
          {
            formId: draft.formId,
            submissionId: draft.submissionId,
          },
        );

        await publishFinalizedCarDraftAction(id, {
          draft: {
            expectedUpdatedAt: draft.expectedUpdatedAt,
            formId: draft.formId,
            uploads,
            values: { ...draft.values, documentFiles: [] },
          },
          targetStatus: draft.stagedStatus,
        });
        draft.values.images.forEach((image) => {
          if (image.url.startsWith("blob:")) URL.revokeObjectURL(image.url);
        });
        setDrafts((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      }

      await load();
      toast.success(t("changesPublished"), {
        description: t("changesPublishedDescription"),
      });
      return true;
    } catch (error) {
      logger.error("FINALIZED-CARS", "Failed to publish finalized car drafts", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error(t("publishError"), {
        description: t("publishErrorDescription"),
      });
      return false;
    } finally {
      setIsPublishing(false);
    }
  }

  function openDiscardConfirmation() {
    modal.preventBackdropClose();
    modal.open({
      className: "gap-2 py-0 sm:max-w-lg",
      headerClassName: "border-0 px-4 py-0 pt-4",
      header: (
        <Text.FormTitle size="base" weight="medium">
          {t("discardTitle")}
        </Text.FormTitle>
      ),
      contentClassName: "px-4 pb-2",
      content: (
        <Text size="sm" color="muted-foreground">
          {t("discardDescription")}
        </Text>
      ),
      footer: (
        <>
          <Button variant="outline" onClick={modal.close}>
            {commonT("keepEditing")}
          </Button>
          <Button
            onClick={() => {
              discardDrafts();
              modal.close();
            }}
          >
            {t("discardChanges")}
          </Button>
        </>
      ),
    });
  }

  function openPublishConfirmation() {
    const incompleteDrafts = new Map(
      Object.entries(drafts).filter(([, draft]) => {
        const { en, it } = draft.values.history;
        return Boolean(en.trim()) !== Boolean(it.trim());
      }),
    );
    const incompleteCount = incompleteDrafts.size;

    modal.preventBackdropClose();
    modal.open({
      className: "gap-2 py-0 sm:max-w-lg",
      headerClassName: "border-0 px-4 py-0 pt-4",
      header: (
        <Text.FormTitle size="base" weight="medium">
          {incompleteCount > 0 ? t("missingLanguageTitle") : t("publishTitle")}
        </Text.FormTitle>
      ),
      contentClassName: "px-4 pb-2",
      content: (
        <Text size="sm" color="muted-foreground">
          {incompleteCount > 0
            ? t("missingLanguageDescription", { count: incompleteCount })
            : t("publishDescription")}
        </Text>
      ),
      footer: ({ loading, close, run }) => (
        <>
          <Button variant="outline" disabled={loading} onClick={close}>
            {commonT("keepEditing")}
          </Button>
          {incompleteCount > 0 ? (
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => {
                const car = pageRows.find((item) =>
                  incompleteDrafts.has(item.id),
                );
                close();
                if (!car) return;

                const draft = incompleteDrafts.get(car.id);
                if (!draft) return;
                void openDetails(
                  car,
                  draft.values.history.en.trim() ? "it" : "en",
                );
              }}
            >
              {t("fixContent")}
            </Button>
          ) : null}
          <Button
            loading={loading}
            onClick={() =>
              void run(async () => {
                if (await publishDrafts()) close();
              })
            }
          >
            {incompleteCount > 0 ? t("publishAnyway") : t("publishChanges")}
          </Button>
        </>
      ),
    });
  }

  function openArchiveConfirmation() {
    modal.open({
      className: "gap-0 p-0 sm:max-w-lg",
      content: <ArchiveFinalizedCarsConfirmation onConfirm={archiveCars} />,
      contentClassName: "p-0",
    });
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        viewport={["desktop", "mobile"]}
        titleAccessory={
          hasDrafts ? (
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/5 text-primary"
            >
              {t("unpublishedChanges")}
            </Badge>
          ) : null
        }
      >
        <Button
          variant="outline"
          disabled={counts.finalized === 0 || hasDrafts || isPublishing}
          onClick={openArchiveConfirmation}
        >
          <Archive className="size-4" /> {t("archiveCars")}
        </Button>
        <Button
          variant="outline"
          disabled={!hasDrafts || isPublishing}
          onClick={openDiscardConfirmation}
        >
          <Undo2 className="size-4" /> {t("discardChanges")}
        </Button>
        <Button
          loading={isPublishing}
          disabled={!hasDrafts || isPublishing}
          onClick={openPublishConfirmation}
        >
          {!isPublishing ? <Save className="size-4" /> : null}
          {t("publishChanges")}
        </Button>
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex items-center gap-5 border-b">
          {(["finalized", "archived"] as const).map((status) => {
            const active = tab === status;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={active}
                className={cn(
                  "-mb-px flex items-center gap-1.5 border-b-2 px-0.5 pb-2.5 text-xs font-semibold tracking-wide uppercase",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setTab(status);
                  setPage(1);
                }}
              >
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px] tabular-nums",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {counts[status]}
                </span>
                {t(`tabs.${status}`)}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            aria-label={t("searchAria")}
            placeholder={t("searchPlaceholder")}
            className="w-72 bg-card pl-9"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Dropdown
          value={classFilter}
          aria-label={t("classFilterAria")}
          className="w-56 bg-card font-normal"
          placeholder={t("allClasses")}
          options={[
            { label: t("allClasses"), value: "all" },
            { label: t("unassigned"), value: "unassigned" },
            ...data.classes.map((item, index) => ({
              label: t("classOption", {
                name: item.name,
                number: romanNumeral(index + 1),
              }),
              value: String(item.id),
            })),
          ]}
          onValueChange={(value) => {
            setClassFilter(value as FinalizedCarClassFilter);
            setPage(1);
          }}
        />
        {query || classFilter !== "all" ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setQuery("");
              setClassFilter("all");
              setPage(1);
            }}
          >
            <X className="size-3.5" /> {t("clearFilters")}
          </Button>
        ) : null}
      </div>

      {showTableLoading ? (
        <FinalizedCarsSkeleton />
      ) : (
        <Card className="overflow-hidden p-0 shadow-none">
          <ClientSideDraggableTable
            data={pageRows}
            columns={columns}
            columnSorting={sorting}
            onColumnSortingChange={(updater) => {
              setSorting((current) =>
                typeof updater === "function" ? updater(current) : updater,
              );
              setPage(1);
            }}
            onReorder={ignoreReorder}
            className="max-h-none overflow-x-auto overflow-y-visible"
            tableClassName="min-w-[1050px] text-sm"
            headerClassName="bg-muted/35"
            bodyClassName="bg-card"
            enableColumnSorting
            serverSideSorting
            enabledRowSorting={false}
            emptyRow={
              <div className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                {counts[tab] === 0
                  ? t(tab === "finalized" ? "emptyFinalized" : "emptyArchived")
                  : t("emptyFiltered")}
              </div>
            }
          />
        </Card>
      )}

      <div className="mt-6">
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
