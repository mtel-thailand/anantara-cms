"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import Text from "@/src/components/ui/text";
import {
  SpecialAwardForm,
  type SpecialAwardFormHandle,
} from "../components/special-award-form";
import type {
  AwardCar,
  AwardClass,
  SpecialAwardItem,
} from "../../awards.types";

type SpecialAwardModalState = ReturnType<typeof createSpecialAwardModalState>;

function createSpecialAwardModalState() {
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

function SpecialAwardModalFooter({
  state,
  cancelLabel,
  saveLabel,
  close,
  onSave,
}: {
  state: SpecialAwardModalState;
  cancelLabel: string;
  saveLabel: string;
  close: () => void;
  onSave: () => void;
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
      <Button disabled={!canSave} onClick={onSave}>
        {saveLabel}
      </Button>
    </>
  );
}

export function useSpecialAwardModal() {
  const modal = useModal();
  const t = useTranslations("awards.specialAwards");
  const commonT = useTranslations("awards.common");

  return useCallback(
    ({
      editing,
      cars,
      classes,
      onSave,
    }: {
      editing?: SpecialAwardItem;
      cars: AwardCar[];
      classes: AwardClass[];
      onSave: (
        item: Omit<
          SpecialAwardItem,
          "id" | "persisted" | "sequence" | "removed"
        >,
      ) => void;
    }) => {
      const formRef = { current: null } as {
        current: SpecialAwardFormHandle | null;
      };
      const state = createSpecialAwardModalState();
      const content = (
        <SpecialAwardForm
          ref={(handle) => {
            formRef.current = handle;
          }}
          editing={editing}
          cars={cars}
          classes={classes}
          onCanSaveChange={state.setCanSave}
          labels={{
            awardType: t("awardType"),
            carAward: t("carAward"),
            notableFigure: t("notableFigure"),
            typeLocked: t("typeLocked"),
            awardTitle: t("awardTitle"),
            titlePlaceholderEn: t("titlePlaceholderEn"),
            titlePlaceholderIt: t("titlePlaceholderIt"),
            car: commonT("car"),
            selectCar: t("selectCar"),
            changeCar: t("changeCar"),
            selectCarTitle: t("selectCarTitle"),
            pickerDescription: t("pickerDescription"),
            personName: t("personName"),
            description: commonT("description"),
            portrait: t("portrait"),
            uploadImage: t("uploadImage"),
            removeImage: t("removeImage"),
            imagePlaceholder: t("imagePlaceholder"),
          }}
        />
      );
      modal.preventBackdropClose();
      modal.open({
        className: "gap-0 p-0 sm:max-w-lg",
        headerClassName: "border-b px-6",
        header: (
          <div>
            <Text.FormTitle size="base" weight="medium">
              {editing ? t("editAward") : t("addAward")}
            </Text.FormTitle>
            <Text className="mt-1" size="sm" color="muted-foreground">
              {t("formDescription")}
            </Text>
          </div>
        ),
        contentClassName: "max-h-[65vh] overflow-y-auto",
        content,
        footerClassName: "px-6",
        footer: ({ close }) => (
          <SpecialAwardModalFooter
            state={state}
            cancelLabel={commonT("cancel")}
            saveLabel={editing ? commonT("saveChanges") : t("addAward")}
            close={close}
            onSave={() => {
              const values = formRef.current?.save();
              if (!values) return;
              onSave({
                kind: values.kind,
                title: values.title,
                titleIt: values.titleIt,
                carId: values.kind === "car" ? values.carId : null,
                personName: values.kind === "figure" ? values.personName : "",
                description: values.kind === "figure" ? values.description : "",
                descriptionIt:
                  values.kind === "figure" ? values.descriptionIt : "",
                imageUrl:
                  values.kind === "figure" ? values.imageUrl || null : null,
              });
              close();
            }}
          />
        ),
      });
    },
    [commonT, modal, t],
  );
}
