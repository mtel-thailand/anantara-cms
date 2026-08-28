"use client";

import { useCallback } from "react";
import type { ComponentType } from "react";

import { useModal } from "@/src/components/providers/modal-provider";
import type { ContentFieldData, ContentFieldLocale, ContentFieldPreviewProps } from "../content-field.types";

export function useContentPreviewModal<PreviewData>() {
  const modal = useModal();

  const openPreview = useCallback(
    ({
      Component,
      content,
      locale,
      previewData,
      surface,
    }: {
      Component: ComponentType<ContentFieldPreviewProps<PreviewData>>;
      content: ContentFieldData;
      locale: ContentFieldLocale;
      previewData: PreviewData;
      surface: "app" | "desktop";
    }) => {
      const app = surface === "app";

      modal.handleHideShowCloseButton();
      modal.disableBackdropClose();
      modal.open({
        className: app
          ? "w-[min(100%-2rem,32rem)] overflow-visible border-0 bg-transparent p-0 shadow-none sm:max-w-none"
          : "flex max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-xl border-0 bg-transparent p-0 shadow-2xl sm:max-w-5xl",
        contentClassName: app ? "p-0" : "min-h-0 flex-1 p-0",
        content: (
          <Component
            content={content}
            locale={locale}
            previewData={previewData}
            surface={surface}
            onClose={modal.close}
          />
        ),
        onOpenChange: (open) => {
          if (!open) {
            modal.reset();
          }
        },
      });
    },
    [modal],
  );

  return { openPreview };
}
