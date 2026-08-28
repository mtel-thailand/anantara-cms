"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import Text from "@/src/components/ui/text";
import type { ContentFieldTranslationNamespace } from "../content-field.types";

export function useContentFieldModals({
  onDiscard,
  onPublish,
  translationNamespace,
}: {
  onDiscard: () => void;
  onPublish: () => Promise<boolean>;
  translationNamespace: ContentFieldTranslationNamespace;
}) {
  const modal = useModal();
  const t = useTranslations(translationNamespace);

  const openDiscardChanges = useCallback(() => {
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
            variant="destructive"
            onClick={() => {
              onDiscard();
              close();
            }}
          >
            {t("discardChanges")}
          </Button>
        </>
      ),
    });
  }, [modal, onDiscard, t]);

  const openPublishChanges = useCallback(() => {
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
      footer: ({ close, loading, run }) => (
        <>
          <Button variant="outline" disabled={loading} onClick={close}>
            {t("keepEditing")}
          </Button>
          <Button
            loading={loading}
            onClick={() => {
              void run(async () => {
                if (await onPublish()) {
                  close();
                }
              });
            }}
          >
            {t("publishChanges")}
          </Button>
        </>
      ),
    });
  }, [modal, onPublish, t]);

  return { openDiscardChanges, openPublishChanges };
}
