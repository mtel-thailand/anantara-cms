"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import type { OverlayElementType } from "@/src/components/providers/app-layout";

interface OverlayPageProps {
  open: boolean;
  setOpen: (isOpen: boolean) => void;
  onClose?: (() => void) | null;
  overlayElement: OverlayElementType;
}

export default function OverlayPage({
  open,
  setOpen,
  onClose,
  overlayElement,
}: OverlayPageProps) {
  const t = useTranslations("common");
  const closeOverlay = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    setOpen(false);
  }, [onClose, setOpen]);

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 transition-all duration-200 select-none",
        open ? "backdrop-blur-xs" : "pointer-events-none backdrop-blur-none",
      )}
      onClick={closeOverlay}
    >
      <div
        className={cn(
          "absolute top-0 right-0 h-full min-w-xs max-w-md transition-all duration-200",
          "flex flex-col border-l bg-popover overflow-auto select-text",
          open ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full",
          overlayElement.panelClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-4 right-4 z-10"
          aria-label={t("close")}
          title={t("close")}
          onClick={closeOverlay}
        >
          <X className="size-4" />
        </Button>

        {overlayElement.header && (
          <div className="shrink-0 p-4 pb-2">{overlayElement.header}</div>
        )}

        {overlayElement.content && (
          <div
            className={cn("flex-1 px-4 pb-6", overlayElement.contentClassName)}
          >
            {overlayElement.content}
          </div>
        )}

        {overlayElement.footer && (
          <div className="shrink-0 p-4">{overlayElement.footer}</div>
        )}
      </div>
    </div>
  );
}
