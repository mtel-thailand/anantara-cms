"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useLayoutContext } from "@/src/components/providers/app-layout";
import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import Text from "@/src/components/ui/text";
import { FinalizedCarDetails } from "@/src/features/cars/finalized/components/finalized-car-details";
import { getCarClassCarDetails } from "@/src/features/cars/finalized/finalized-cars.service";
import type { ContentFieldData } from "@/src/features/content-field/content-field.types";
import { AwardCarPicker } from "../components/award-car-picker";
import {
  AwardDescriptionForm,
  type AwardDescriptionFormHandle,
} from "../components/award-description-form";
import type { AwardCar, AwardClass } from "../awards.types";

type AwardDescriptionModalState = ReturnType<
  typeof createAwardDescriptionModalState
>;

function createAwardDescriptionModalState() {
  let canSave = false;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => canSave,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setCanSave: (nextCanSave: boolean) => {
      if (canSave === nextCanSave) return;
      canSave = nextCanSave;
      listeners.forEach((listener) => listener());
    },
  };
}

function AwardDescriptionModalFooter({
  state,
  cancelLabel,
  saveLabel,
  close,
  onSave,
}: {
  state: AwardDescriptionModalState;
  cancelLabel: string;
  saveLabel: string;
  close: () => void;
  onSave: () => ContentFieldData | null | undefined;
}) {
  const canSave = useSyncExternalStore(
    state.subscribe,
    state.getSnapshot,
    state.getSnapshot,
  );

  return (
    <>
      <Button variant="outline" onClick={close}>
        {cancelLabel}
      </Button>
      <Button
        disabled={!canSave}
        onClick={() => {
          const data = onSave();
          if (!data) return;
          close();
        }}
      >
        {saveLabel}
      </Button>
    </>
  );
}

export function useAwardModals() {
  const t = useTranslations("awards.common");
  const modal = useModal();
  const { handleCloseOverlay, handleOpenOverlay, setOverlayPage } =
    useLayoutContext();
  const detailInstance = useRef(0);

  const openConfirm = useCallback(
    (options: {
      title: string;
      description: string;
      confirmLabel: string;
      cancelLabel: string;
      destructive?: boolean;
      onConfirm: () => void;
    }) => {
      modal.preventBackdropClose();
      modal.open({
        className: "gap-1.5 p-0 sm:max-w-sm",
        headerClassName: "border-0 px-4 pb-0 pt-4",
        header: (
          <Text.FormTitle size="base" weight="medium">
            {options.title}
          </Text.FormTitle>
        ),
        contentClassName: "px-4 pb-3",
        content: (
          <Text size="sm" color="muted-foreground">
            {options.description}
          </Text>
        ),
        footerClassName: "px-4",
        footer: ({ close }) => (
          <>
            <Button variant="outline" onClick={close}>
              {options.cancelLabel}
            </Button>
            <Button
              variant={options.destructive ? "destructive" : "default"}
              onClick={() => {
                options.onConfirm();
                close();
              }}
            >
              {options.confirmLabel}
            </Button>
          </>
        ),
      });
    },
    [modal],
  );

  const openPublish = useCallback(
    (options: {
      title: string;
      description: string;
      keepEditingLabel: string;
      publishLabel: string;
      onPublish: () => Promise<boolean>;
      languageGap?: {
        title: string;
        description: string;
        fixContentLabel: string;
        publishAnywayLabel: string;
        onFixContent: () => void;
      };
    }) => {
      const languageGap = options.languageGap;
      modal.preventBackdropClose();
      modal.open({
        className: "gap-1.5 p-0 sm:max-w-sm",
        headerClassName: "border-0 px-4 pb-0 pt-4",
        header: (
          <Text.FormTitle size="base" weight="medium">
            {languageGap?.title ?? options.title}
          </Text.FormTitle>
        ),
        contentClassName: "px-4 pb-3",
        content: (
          <Text size="sm" color="muted-foreground">
            {languageGap?.description ?? options.description}
          </Text>
        ),
        footerClassName: "px-4",
        footer: ({ close, loading, run }) => (
          <>
            <Button variant="outline" disabled={loading} onClick={close}>
              {options.keepEditingLabel}
            </Button>
            {languageGap ? (
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => {
                  languageGap.onFixContent();
                  close();
                }}
              >
                {languageGap.fixContentLabel}
              </Button>
            ) : null}
            <Button
              loading={loading}
              onClick={() => {
                void run(async () => {
                  if (await options.onPublish()) close();
                });
              }}
            >
              {languageGap?.publishAnywayLabel ?? options.publishLabel}
            </Button>
          </>
        ),
      });
    },
    [modal],
  );

  const openCarPicker = useCallback(
    (options: {
      cars: AwardCar[];
      classes: AwardClass[];
      currentCarId?: string | null;
      excludedCarId?: string | null;
      lockedClassId?: number;
      title: string;
      description?: string;
      onSelect: (carId: string) => void;
    }) => {
      modal.preventBackdropClose();
      modal.open({
        className:
          "flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl",
        headerClassName: "border-b px-6",
        header: (
          <div>
            <Text.FormTitle size="xl" weight="medium">
              {options.title}
            </Text.FormTitle>
            {options.description ? (
              <Text className="mt-1" size="sm" color="muted-foreground">
                {options.description}
              </Text>
            ) : null}
          </div>
        ),
        contentClassName: "flex min-h-0 flex-1 flex-col",
        content: (
          <AwardCarPicker
            cars={options.cars}
            classes={options.classes}
            currentCarId={options.currentCarId}
            excludedCarId={options.excludedCarId}
            lockedClassId={options.lockedClassId}
            onSelect={(carId) => {
              options.onSelect(carId);
              modal.close();
            }}
          />
        ),
      });
    },
    [modal],
  );

  const openDescription = useCallback(
    (options: {
      initialData: ContentFieldData;
      title: string;
      description: string;
      cancelLabel: string;
      saveLabel: string;
      labels: {
        field: string;
        requiredError: string;
      };
      onSave: (data: ContentFieldData) => void;
    }) => {
      const formRef = { current: null } as {
        current: AwardDescriptionFormHandle | null;
      };
      const state = createAwardDescriptionModalState();
      modal.preventBackdropClose();
      modal.open({
        className: "gap-0 p-0 sm:max-w-lg",
        headerClassName: "border-0 px-5 pb-0 pt-5",
        header: (
          <div>
            <Text.FormTitle>{options.title}</Text.FormTitle>
            <Text className="mt-1" size="sm" color="muted-foreground">
              {options.description}
            </Text>
          </div>
        ),
        contentClassName: "overflow-y-auto",
        content: (
          <AwardDescriptionForm
            ref={(handle) => {
              formRef.current = handle;
            }}
            initialData={structuredClone(options.initialData)}
            fieldLabel={options.labels.field}
            requiredError={options.labels.requiredError}
            onCanSaveChange={state.setCanSave}
          />
        ),
        footerClassName: "px-5",
        footer: ({ close }) => (
          <AwardDescriptionModalFooter
            state={state}
            cancelLabel={options.cancelLabel}
            saveLabel={options.saveLabel}
            close={close}
            onSave={() => {
              const data = formRef.current?.save();
              if (!data) return;
              options.onSave(data);
              return data;
            }}
          />
        ),
      });
    },
    [modal],
  );

  const openCarDetails = useCallback(
    async (car: AwardCar) => {
      if (!car.submissionVehicleId) {
        toast.error(t("detailsError"), { description: t("detailsTryAgain") });
        return;
      }

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
        toast.error(t("detailsError"), {
          description:
            error instanceof Error ? error.message : t("detailsTryAgain"),
        });
      }
    },
    [handleCloseOverlay, handleOpenOverlay, setOverlayPage, t],
  );

  return {
    openCarDetails,
    openCarPicker,
    openConfirm,
    openDescription,
    openPublish,
  };
}
