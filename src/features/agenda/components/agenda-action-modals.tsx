"use client";

import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import Text from "@/src/components/ui/text";
import { useCallback } from "react";

type PublishModalOptions = {
  incompleteCount: number;
  onFixContent: () => void;
  onPublish: () => Promise<boolean>;
};

export function useAgendaActionModals() {
  const modal = useModal();

  const openDiscardModal = useCallback(
    (onDiscard: () => void) => {
      modal.preventBackdropClose();
      modal.open({
        header: (
          <Text.FormTitle size="base" weight="medium">
            Discard unpublished changes?
          </Text.FormTitle>
        ),
        content: (
          <Text size="sm" color="muted-foreground">
            This reverts this page to the last published version. Every edit,
            addition, reorder, and pending removal made since then will be lost.
            This cannot be undone.
          </Text>
        ),
        footer: (
          <>
            <Button variant="outline" onClick={modal.close}>
              Keep editing
            </Button>
            <Button
              onClick={() => {
                onDiscard();
                modal.close();
              }}
            >
              Discard changes
            </Button>
          </>
        ),
      });
    },
    [modal],
  );

  const openPublishModal = useCallback(
    ({ incompleteCount, onFixContent, onPublish }: PublishModalOptions) => {
      modal.preventBackdropClose();
      modal.open({
        header: (
          <Text.FormTitle size="base" weight="medium">
            {incompleteCount > 0
              ? "Some content is missing a language"
              : "Publish changes?"}
          </Text.FormTitle>
        ),
        contentClassName: "px-4",
        content: (
          <Text size="sm" color="muted-foreground">
            {incompleteCount > 0
              ? `${incompleteCount} item has content in only one language (English or Italian). You can fix the missing translations first, or publish anyway and complete them later.`
              : "This makes your changes live on the website."}
          </Text>
        ),
        footer: ({ loading, close, run }) => (
          <>
            <Button variant="outline" disabled={loading} onClick={close}>
              Keep editing
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
                Fix content
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
              {incompleteCount ? "Publish anyway" : "Publish changes"}
            </Button>
          </>
        ),
      });
    },
    [modal],
  );

  return { openDiscardModal, openPublishModal };
}
