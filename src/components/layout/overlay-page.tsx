import { cn } from "@/src/lib/utils";
import React from "react";
import { OverlayElementType } from "../providers/app-layout";

interface OverlayPageProps {
  open: boolean;
  setOpen: (isOpen: boolean) => void;
  overlayElement: OverlayElementType;
}

export default function OverlayPage({
  open,
  setOpen,
  overlayElement,
}: OverlayPageProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-50 transition-all duration-200 select-none",
        open ? "backdrop-blur-xs" : "pointer-events-none backdrop-blur-none",
      )}
      onClick={() => setOpen(false)}
    >
      <div
        className={cn(
          "absolute top-0 right-0 h-full min-w-xs max-w-md transition-all duration-200",
          "flex flex-col border-l bg-popover overflow-auto select-text",
          open ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {overlayElement.header && (
          <div className="shrink-0 p-4 pb-2">
            {overlayElement.header}
          </div>
        )}

        {overlayElement.content && (
          <div className="flex-1 px-4 pb-6">
            {overlayElement.content}
          </div>
        )}

        {overlayElement.footer && (
          <div className="shrink-0 p-4">
            {overlayElement.footer}
          </div>
        )}
      </div>
    </div>
  );
}
