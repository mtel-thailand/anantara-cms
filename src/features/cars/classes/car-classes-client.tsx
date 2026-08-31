"use client";

import { Plus, Undo2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { toast } from "sonner";

import { PageHeader } from "@/src/components/page-header";
import { useLayoutContext } from "@/src/components/providers/app-layout";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import ClientSideDraggableTable from "@/src/components/ui/table/client-side-custom-table";
import { publishCarClassesAction } from "@/src/features/cars/classes/car-classes.actions";
import type {
  CarClass,
  CarClassesData,
  CarClassRow,
  ClassAssignableCar,
} from "@/src/features/cars/classes/car-classes.types";
import { FinalizedCarDetails } from "@/src/features/cars/finalized/components/finalized-car-details";
import { getCarClassCarDetails } from "@/src/features/cars/finalized/finalized-cars.service";
import { useCarClassModals } from "@/src/features/cars/classes/hooks/use-car-class-modals";
import {
  createCarClassRows,
  CAR_CLASSES_DRAFT_STORAGE_VERSION,
  getLiveClassPositions,
  groupCarsByClass,
  normalizeCarAssignmentSequences,
  normalizedCarClassesSnapshot,
  stripCarClassRow,
  storedCarClassesDraft,
  updateCarClassSequences,
} from "@/src/features/cars/classes/car-classes.helpers";
import { useCarClassTable } from "@/src/features/cars/classes/hooks/use-car-class-table";
import { CarRoster } from "@/src/features/cars/classes/components/car-roster";
import useAsync from "@/src/hooks/use-async";
import { runAsyncTask } from "@/src/lib/async";
import { cn } from "@/src/lib/utils";

const CAR_CLASSES_DRAFT_STORAGE_KEY = "anantara-cms:car-classes-draft:v1";

export function CarClassesClient({
  initialData,
}: {
  initialData: CarClassesData;
}) {
  const t = useTranslations("cars.classes");
  const { handleCloseOverlay, handleOpenOverlay, setOverlayPage } =
    useLayoutContext();
  const [publishedData, setPublishedData] =
    useState<CarClassesData>(initialData);
  const [draftData, setDraftData] = useState<CarClassesData>(initialData);
  const [draftStorageHydrated, setDraftStorageHydrated] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const { isLoading: isPublishing, execute } = useAsync(false);
  const detailInstance = useRef(0);

  const [columnSorting, setColumnSorting] = useState<SortingState>([]);

  const dirty =
    normalizedCarClassesSnapshot(publishedData) !==
    normalizedCarClassesSnapshot(draftData);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CAR_CLASSES_DRAFT_STORAGE_KEY);
      if (!stored) return;

      const restoredDraft = storedCarClassesDraft(JSON.parse(stored));
      if (
        !restoredDraft ||
        (restoredDraft.classes.length === 0 &&
          initialData.classes.length > 0) ||
        (restoredDraft.cars.length === 0 && initialData.cars.length > 0)
      ) {
        window.localStorage.removeItem(CAR_CLASSES_DRAFT_STORAGE_KEY);
        return;
      }

      setDraftData(restoredDraft);
    } catch {
      window.localStorage.removeItem(CAR_CLASSES_DRAFT_STORAGE_KEY);
    } finally {
      setDraftStorageHydrated(true);
    }
  }, [initialData]);

  useEffect(() => {
    if (!draftStorageHydrated) return;

    if (!dirty) {
      window.localStorage.removeItem(CAR_CLASSES_DRAFT_STORAGE_KEY);
      return;
    }

    if (
      (draftData.classes.length === 0 && publishedData.classes.length > 0) ||
      (draftData.cars.length === 0 && publishedData.cars.length > 0)
    ) {
      window.localStorage.removeItem(CAR_CLASSES_DRAFT_STORAGE_KEY);
      return;
    }

    try {
      window.localStorage.setItem(
        CAR_CLASSES_DRAFT_STORAGE_KEY,
        JSON.stringify({
          data: draftData,
          version: CAR_CLASSES_DRAFT_STORAGE_VERSION,
        }),
      );
    } catch (error) {
      // Storage may be unavailable or full; the editable draft remains in memory.
      console.log("Set draft error", error);
    }
  }, [draftData, draftStorageHydrated, dirty, publishedData]);

  const livePositions = useMemo(
    () => getLiveClassPositions(draftData.classes),
    [draftData.classes],
  );

  const carsByClass = useMemo(
    () => groupCarsByClass(draftData.cars),
    [draftData.cars],
  );

  const displayClasses = useMemo(
    () => createCarClassRows(draftData.classes, carsByClass),
    [draftData.classes, carsByClass],
  );

  const {
    openRemoveClass,
    openClassForm,
    openAssignCars,
    openReorderCars,
    openRemoveCar,
    openDiscardChanges,
    openPublishChanges,
  } = useCarClassModals({
    draftData,
    publishedData,
    carsByClass,
    livePositions,
    setDraftData,
    setExpandedClassId,
  });

  const restoreClass = useCallback(
    (id: string) => {
      const carClass = draftData.classes.find(({ id: classId }) => classId === id);
      if (!carClass) return;

      setDraftData((current) => ({
        ...current,
        classes: updateCarClassSequences(
          current.classes.map((item) =>
            item.id === id ? { ...item, removed: false } : item,
          ),
        ),
      }));
      toast.success(t("classRestored", { class: carClass.name }));
    },
    [draftData.classes, t],
  );

  const classColumns = useCarClassTable({
    expandedClassId,
    livePositions,
    publishedClasses: publishedData.classes,
    setExpandedClassId,
    restoreClass,
    openReorderCars,
    openAssignCars,
    openClassForm,
    openRemoveClass,
  });

  const openCarDetails = useCallback(
    async (car: ClassAssignableCar) => {
      try {
        const details = await getCarClassCarDetails(car.submissionVehicleId);
        detailInstance.current += 1;
        setOverlayPage({
          content: (
            <FinalizedCarDetails
              key={`${details.id}-${detailInstance.current}`}
              car={details}
              onClose={handleCloseOverlay}
              onDirtyChange={() => {}}
              onStageDraft={() => {}}
              previewOnly
            />
          ),
          panelClassName: "w-full max-w-3xl p-0",
          contentClassName: "px-0 pb-0",
          onClose: handleCloseOverlay,
        });
        handleOpenOverlay();
      } catch (error) {
        console.log("error", error);
        toast.error(t("detailsError"), {
          description: error instanceof Error ? error.message : t("tryAgain"),
        });
      }
    },
    [handleCloseOverlay, handleOpenOverlay, setOverlayPage, t],
  );

  async function publish() {
    await execute<[], void>(async () => {
      await runAsyncTask({
        action: async () => {
          const removedIds = new Set(
            draftData.classes
              .filter(({ removed }) => removed)
              .map(({ id }) => id),
          );
          const normalizedCars = normalizeCarAssignmentSequences(
            draftData.cars.map((car) =>
              removedIds.has(car.categoryId ?? "")
                ? { ...car, categoryId: null, sequence: null }
                : car,
            ),
          );
          const canonical = await publishCarClassesAction({
            revision: draftData.revision,
            classes: draftData.classes.map(
              ({ id, name, removed, sequence }) => ({
                id,
                name,
                removed,
                sequence,
              }),
            ),
            cars: normalizedCars.map(({ id, categoryId, sequence }) => ({
              id,
              categoryId,
              sequence,
            })),
          });
          setPublishedData(canonical);
          setDraftData(canonical);
          setExpandedClassId(null);
          toast.success(t("publishSuccess"), {
            description: t("publishSuccessDescription"),
          });
        },
        onError: (error) => {
          toast.error(t("publishError"), {
            description: error instanceof Error ? error.message : t("tryAgain"),
          });
        },
      });
    });
  }

  const handleReorder = useCallback(
    (ordered: CarClassRow[]) => {
      if (columnSorting.length > 0) return;

      setDraftData((current) => ({
        ...current,
        classes: updateCarClassSequences(ordered.map(stripCarClassRow)),
      }));
    },
    [columnSorting.length],
  );

  const renderExpandedRow = useCallback(
    (carClass: CarClass) => {
      if (expandedClassId !== carClass.id || carClass.removed) {
        return null;
      }

      const roster = carsByClass.get(carClass.id) ?? [];

      return (
        <tr className="border-b bg-muted/15">
          <td colSpan={6}>
            <CarRoster
              cars={roster}
              onOpen={(car) => void openCarDetails(car)}
              onRemove={openRemoveCar}
            />
          </td>
        </tr>
      );
    },
    [carsByClass, expandedClassId, openCarDetails, openRemoveCar],
  );

  const getRowClassName = (carClass: CarClass) =>
    cn("bg-card last:border-b-0", carClass.removed && "opacity-60");

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        viewport={["desktop", "mobile"]}
        titleAccessory={
          dirty ? (
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
          leftIcon={Plus}
          onClick={() => openClassForm()}
        >
          {t("addClass")}
        </Button>
        <Button
          variant="outline"
          leftIcon={Undo2}
          disabled={!dirty || isPublishing}
          onClick={openDiscardChanges}
        >
          {t("discardChanges")}
        </Button>
        <Button
          leftIcon={Upload}
          loading={isPublishing}
          disabled={!dirty}
          onClick={() => void openPublishChanges({ publish })}
        >
          {t("publishChanges")}
        </Button>
      </PageHeader>

      <p className="mb-4 text-sm text-muted-foreground">
        {columnSorting.length ? t("sortedHint") : t("dragHint")}
      </p>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <ClientSideDraggableTable
          data={displayClasses}
          columns={classColumns}
          onReorder={handleReorder}
          columnSorting={columnSorting}
          onColumnSortingChange={setColumnSorting}
          enableColumnSorting
          enabledRowSorting
          canDragRow={(carClass) =>
            columnSorting.length === 0 && !carClass.removed
          }
          className="!max-h-none !overflow-visible h-full"
          tableClassName="h-full"
          headerClassName="sticky top-0 z-10 bg-card"
          getRowClassName={getRowClassName}
          renderExpandedRow={renderExpandedRow}
          emptyRow={
            <div className="flex h-20 items-center justify-center px-4 text-center text-sm text-muted-foreground">
              {t("empty")}
            </div>
          }
        />
      </div>
    </>
  );
}
