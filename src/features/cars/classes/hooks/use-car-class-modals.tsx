import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import Text from "@/src/components/ui/text";
import {
  normalizeCarAssignmentSequences,
  updateCarClassSequences,
} from "@/src/features/cars/classes/car-classes.helpers";
import type {
  CarClass,
  CarClassesData,
  ClassAssignableCar,
} from "@/src/features/cars/classes/car-classes.types";
import { AssignCarsModal } from "@/src/features/cars/classes/components/assign-cars-modal";
import { CarClassFormModal } from "@/src/features/cars/classes/components/car-class-form-modal";
import { ReorderCarsModal } from "@/src/features/cars/classes/components/reorder-cars-modal";
import { romanNumeral } from "@/src/features/cars/car-class-number.helpers";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

export function useCarClassModals({
  draftData,
  carsByClass,
  livePositions,
  setDraftData,
  publishedData,
  setExpandedClassId,
}: {
  draftData: CarClassesData;
  publishedData: CarClassesData;
  carsByClass: Map<string, ClassAssignableCar[]>;
  livePositions: Map<string, number>;
  setDraftData: Dispatch<SetStateAction<CarClassesData>>;
  setExpandedClassId: Dispatch<SetStateAction<string | null>>;
}) {
  const t = useTranslations("cars.classes");
  const commonT = useTranslations("common");
  const modal = useModal();

  const removeClass = useCallback(
    (carClass: CarClass) => {
      setDraftData((current) =>
        carClass.databaseId === null
          ? {
              ...current,
              classes: updateCarClassSequences(
                current.classes.filter(({ id }) => id !== carClass.id),
              ),
              cars: current.cars.map((car) =>
                car.categoryId === carClass.id
                  ? { ...car, categoryId: null, sequence: null }
                  : car,
              ),
            }
          : {
              ...current,
              classes: updateCarClassSequences(
                current.classes.map((item) =>
                  item.id === carClass.id ? { ...item, removed: true } : item,
                ),
              ),
            },
      );
      toast.success(t("classMarkedForRemoval"), {
        description: t("classMarkedForRemovalDescription"),
      });
    },
    [setDraftData, t],
  );

  const openRemoveClass = useCallback(
    (carClass: CarClass) => {
      const assignedCarCount = carsByClass.get(carClass.id)?.length ?? 0;
      modal.preventBackdropClose();
      modal.open({
        className: "gap-1.5 p-0 sm:max-w-sm",
        headerClassName: "border-0 px-4 pb-0 pt-4",
        header: (
          <Text.FormTitle size="base" weight="medium">
            {t("removeClassTitle", { class: carClass.name })}
          </Text.FormTitle>
        ),
        contentClassName: "px-4 pb-3",
        content: (
          <Text size="sm" color="muted-foreground">
            {assignedCarCount > 0
              ? t("removeClassWithCarsDescription", { count: assignedCarCount })
              : t("removeEmptyClassDescription")}
          </Text>
        ),
        footerClassName: "px-4",
        footer: ({ close }) => (
          <>
            <Button variant="outline" onClick={close}>
              {commonT("cancel")}
            </Button>
            <Button
              onClick={() => {
                removeClass(carClass);
                close();
              }}
            >
              {commonT("remove")}
            </Button>
          </>
        ),
      });
    },
    [carsByClass, commonT, modal, removeClass, t],
  );

  const openClassForm = useCallback(
    (carClass?: CarClass) => {
      const position = carClass
        ? (livePositions.get(carClass.id) ?? carClass.sequence)
        : draftData.classes.filter(({ removed }) => !removed).length + 1;
      modal.preventBackdropClose();
      modal.open({
        className: "gap-0 p-0 sm:max-w-md",
        contentClassName: "p-0",
        content: (
          <CarClassFormModal
            carClass={carClass}
            position={position}
            assignedCarCount={
              carClass ? (carsByClass.get(carClass.id)?.length ?? 0) : 0
            }
            onDelete={carClass ? () => removeClass(carClass) : undefined}
            onSave={(name) => {
              const trimmed = name.trim();
              const duplicate = draftData.classes.some(
                (item) =>
                  !item.removed &&
                  item.id !== carClass?.id &&
                  item.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
              );
              if (duplicate) return t("duplicateClassName");
              setDraftData((current) =>
                carClass
                  ? {
                      ...current,
                      classes: current.classes.map((item) =>
                        item.id === carClass.id
                          ? { ...item, name: trimmed }
                          : item,
                      ),
                    }
                  : {
                      ...current,
                      classes: [
                        ...current.classes,
                        {
                          id: `temp-${crypto.randomUUID()}`,
                          databaseId: null,
                          name: trimmed,
                          removed: false,
                          sequence: position,
                        },
                      ],
                    },
              );
              toast.success(
                carClass
                  ? t("classUpdated", { number: romanNumeral(position) })
                  : t("classCreated", { number: romanNumeral(position) }),
                { description: t("rememberToPublish") },
              );
              return null;
            }}
          />
        ),
      });
    },
    [carsByClass, draftData.classes, livePositions, modal, removeClass, setDraftData, t],
  );

  const openAssignCars = useCallback(
    (carClass: CarClass) => {
      modal.open({
        className: "gap-0 p-0 sm:max-w-lg",
        headerClassName: "border-0 px-4 pb-0 pt-4",
        header: (
          <div>
            <Text.FormTitle size="base" weight="medium">
              {t("assignCarsTitle", {
                class: `${t("classNumber", { number: romanNumeral(livePositions.get(carClass.id) ?? carClass.sequence) })} — ${carClass.name}`,
              })}
            </Text.FormTitle>
            <Text className="mt-1" size="sm" color="muted-foreground">
              {t("assignCarsDescription")}
            </Text>
          </div>
        ),
        contentClassName: "px-4 py-4",
        content: (
          <AssignCarsModal
            cars={draftData.cars}
            onAssign={(car) => {
              if (!car.assignable) return;

              setDraftData((current) => {
                const count = current.cars.filter(
                  ({ categoryId }) => categoryId === carClass.id,
                ).length;
                return {
                  ...current,
                  cars: current.cars.map((item) =>
                    item.id === car.id
                      ? {
                          ...item,
                          categoryId: carClass.id,
                          sequence: count + 1,
                        }
                      : item,
                  ),
                };
              });
              toast.success(
                t("carAssigned", {
                  car: car.name,
                  class: `${t("classNumber", {
                    number: romanNumeral(
                      livePositions.get(carClass.id) ?? carClass.sequence,
                    ),
                  })} — ${carClass.name}`,
                }),
              );
            }}
          />
        ),
        footerClassName: "px-4",
        footer: ({ close }) => (
          <Button variant="outline" onClick={close}>
            {t("done")}
          </Button>
        ),
      });
    },
    [draftData.cars, livePositions, modal, setDraftData, t],
  );

  const openReorderCars = useCallback(
    (carClass: CarClass) => {
      const cars = carsByClass.get(carClass.id) ?? [];
      modal.open({
        className: "gap-0 p-0 sm:max-w-lg",
        headerClassName: "border-0 px-4 pb-0 pt-4",
        header: (
          <div>
            <Text.FormTitle size="base" weight="medium">
              {t("reorderCarsTitle", {
                class: `${t("classNumber", { number: romanNumeral(livePositions.get(carClass.id) ?? carClass.sequence) })} — ${carClass.name}`,
              })}
            </Text.FormTitle>
            <Text className="mt-1" size="sm" color="muted-foreground">
              {t("reorderCarsDescription")}
            </Text>
          </div>
        ),
        contentClassName: "px-4 py-4",
        content: (
          <ReorderCarsModal
            cars={cars}
            onChange={(ordered) =>
              setDraftData((current) => ({
                ...current,
                cars: current.cars.map((car) => {
                  const index = ordered.findIndex(({ id }) => id === car.id);
                  return index < 0 ? car : { ...car, sequence: index + 1 };
                }),
              }))
            }
          />
        ),
        footerClassName: "px-4",
        footer: ({ close }) => <Button onClick={close}>{t("done")}</Button>,
      });
    },
    [carsByClass, livePositions, modal, setDraftData, t],
  );

  const openRemoveCar = useCallback(
    (car: ClassAssignableCar) => {
      const carClass = draftData.classes.find(
        ({ id }) => id === car.categoryId,
      );
      modal.preventBackdropClose();
      modal.open({
        className: "gap-1.5 p-0 sm:max-w-sm",
        headerClassName: "border-0 px-4 pb-0 pt-4",
        header: (
          <Text.FormTitle size="base" weight="medium">
            {t("removeCarTitle", { car: car.name })}
          </Text.FormTitle>
        ),
        contentClassName: "px-4 pb-3",
        content: (
          <Text size="sm" color="muted-foreground">
            {t("removeCarDescription")}
          </Text>
        ),
        footerClassName: "px-4",
        footer: ({ close }) => (
          <>
            <Button variant="outline" onClick={close}>
              {commonT("cancel")}
            </Button>
            <Button
              onClick={() => {
                setDraftData((current) => ({
                  ...current,
                  cars: normalizeCarAssignmentSequences(
                    current.cars.map((item) =>
                      item.id === car.id
                        ? { ...item, categoryId: null, sequence: null }
                        : item,
                    ),
                  ),
                }));
                close();
                toast.success(
                  carClass
                    ? t("carRemoved", { car: car.name, class: carClass.name })
                    : t("carRemovedWithoutClass", { car: car.name }),
                  { description: t("carRemovedDescription") },
                );
              }}
            >
              {commonT("remove")}
            </Button>
          </>
        ),
      });
    },
    [commonT, draftData.classes, modal, setDraftData, t],
  );

  const openDiscardChanges = () => {
    modal.preventBackdropClose();
    modal.open({
      className: "gap-1.5 p-0 sm:max-w-sm",
      headerClassName: "border-0 px-4 pb-0 pt-4",
      header: (
        <Text.FormTitle size="base" weight="medium">
          {t("discardDialogTitle")}
        </Text.FormTitle>
      ),
      contentClassName: "px-4 pb-3",
      content: (
        <Text size="sm" color="muted-foreground">
          {t("discardDialogDescription")}
        </Text>
      ),
      footerClassName: "px-4",
      footer: ({ close }) => (
        <>
          <Button variant="outline" onClick={close}>
            {t("keepEditing")}
          </Button>
          <Button
            onClick={() => {
              setDraftData(publishedData);
              setExpandedClassId(null);
              toast.success(t("discardSuccess"));
              close();
            }}
          >
            {t("discardChanges")}
          </Button>
        </>
      ),
    });
  };

  const openPublishChanges = ({
    publish,
  }: {
    publish: () => Promise<void>;
  }) => {
    modal.preventBackdropClose();
    modal.open({
      className: "gap-1.5 p-0 sm:max-w-sm",
      headerClassName: "border-0 px-4 pb-0 pt-4",
      header: (
        <Text.FormTitle size="base" weight="medium">
          {t("publishDialogTitle")}
        </Text.FormTitle>
      ),
      contentClassName: "px-4 pb-3",
      content: (
        <Text size="sm" color="muted-foreground">
          {t("publishDialogDescription")}
        </Text>
      ),
      footerClassName: "px-4",
      footer: ({ run, close, loading }) => (
        <>
          <Button variant="outline" onClick={close}>
            {t("keepEditing")}
          </Button>
          <Button
            loading={loading}
            onClick={async () => {
              void run(async () => {
                await publish();
                close();
              });
            }}
          >
            {t("publishChanges")}
          </Button>
        </>
      ),
    });
  };

  return {
    openRemoveClass,
    openClassForm,
    openAssignCars,
    openReorderCars,
    openRemoveCar,
    openDiscardChanges,
    openPublishChanges,
  };
}
