"use client";

import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import Text from "@/src/components/ui/text";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

type PublishModalOptions = {
  incompleteCount: number;
  onFixContent: () => void;
  onPublish: () => Promise<boolean>;
};

export function useAgendaActionModals() {
  const modal = useModal();
  const t = useTranslations("agenda");
  const actionT = useTranslations("agenda.actions");
  const commonT = useTranslations("common");

  const openDiscardModal = useCallback(
    (onDiscard: () => void) => {
      modal.preventBackdropClose();
      modal.open({
        header: (
          <Text.FormTitle size="base" weight="medium">
            {actionT("discardTitle")}
          </Text.FormTitle>
        ),
        content: (
          <Text size="sm" color="muted-foreground">
            {actionT("discardDescription")}
          </Text>
        ),
        footer: (
          <>
            <Button variant="outline" onClick={modal.close}>
              {commonT("keepEditing")}
            </Button>
            <Button
              onClick={() => {
                onDiscard();
                modal.close();
              }}
            >
              {t("discardChanges")}
            </Button>
          </>
        ),
      });
    },
    [actionT, commonT, modal, t],
  );

  const openPublishModal = useCallback(
    ({ incompleteCount, onFixContent, onPublish }: PublishModalOptions) => {
      modal.preventBackdropClose();
      modal.open({
        header: (
          <Text.FormTitle size="base" weight="medium">
            {incompleteCount > 0
              ? actionT("missingLanguageTitle")
              : actionT("publishTitle")}
          </Text.FormTitle>
        ),
        contentClassName: "px-4",
        content: (
          <Text size="sm" color="muted-foreground">
            {incompleteCount > 0
              ? actionT("missingLanguageDescription", {
                  count: incompleteCount,
                })
              : actionT("publishDescription")}
          </Text>
        ),
        footer: ({ loading, close, run }) => (
          <>
            <Button variant="outline" disabled={loading} onClick={close}>
              {commonT("keepEditing")}
            </Button>
            {incompleteCount > 0 && (
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => {
                  onFixContent();
                  close();
                }}
              >
                {actionT("fixContent")}
              </Button>
            )}
            <Button
              loading={loading}
              onClick={() =>
                void run(async () => {
                  if (await onPublish()) close();
                })
              }
            >
              {incompleteCount
                ? actionT("publishAnyway")
                : t("publishChanges")}
            </Button>
          </>
        ),
      });
    },
    [actionT, commonT, modal, t],
  );

  return { openDiscardModal, openPublishModal };
}
