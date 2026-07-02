"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../ui/dialog";
import { cn } from "@/src/lib/utils";

type ModalContextValue = {
  open: (elements?: ElementModalType) => void;
  close: () => void;
  reset: () => void;
  preventBackdropClose: () => void;
  disableBackdropClose: () => void;
  handleShowShowCloseButton: () => void;
  handleHideShowCloseButton: () => void;
};

const ModalContext = React.createContext<ModalContextValue | null>(null);

type ModalRun = (action: () => void | Promise<void>) => Promise<void>;

type ModalFooterRenderProps = {
  loading: boolean;
  close: () => void;
  run: ModalRun;
};

type ElementModalType = {
  header?: React.ReactNode | null;
  headerClassName?: string;
  content?: React.ReactNode | null;
  contentClassName?: string;
  footer?:
    | React.ReactNode
    | ((props: ModalFooterRenderProps) => React.ReactNode)
    | null;
  footerClassName?: string;
  onOpenChange?: ((open: boolean) => void) | null;
};
const defaultElement: ElementModalType = {
  header: null,
  headerClassName: "border-b px-4",
  content: null,
  contentClassName: "",
  footer: null,
  footerClassName: "px-4",
  onOpenChange: null,
};

export default function ModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [element, setElement] =
    React.useState<ElementModalType>(defaultElement);
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  const [allowBackdropClose, setAllowBackdropClose] = React.useState(false);
  const [showCloseButton, setShowCloseButton] = React.useState<boolean>(true);
  const [loading, setLoading] = React.useState<boolean>(false);
  const runningRef = React.useRef(false);
  const onOpenChangeRef = React.useRef<((open: boolean) => void) | null>(null);

  const close = React.useCallback(() => {
    setModalOpen(false);
    onOpenChangeRef.current?.(false);
  }, []);

  const open = React.useCallback((elements?: ElementModalType) => {
    if (elements) {
      onOpenChangeRef.current = elements.onOpenChange ?? null;
      setElement({ ...defaultElement, ...elements });
    }
    setModalOpen(true);
  }, []);

  const reset = React.useCallback(() => {
    setElement(defaultElement);
    onOpenChangeRef.current = null;
    setAllowBackdropClose(true);
    setShowCloseButton(true);
    setLoading(false);
  }, []);

  const run = React.useCallback<ModalRun>(async (action) => {
    if (runningRef.current) return;

    runningRef.current = true;
    setLoading(true);

    try {
      await action();
    } finally {
      runningRef.current = false;
      setLoading(false);
    }
  }, []);

  const preventBackdropClose = React.useCallback(() => {
    setAllowBackdropClose(false);
  }, []);

  const disableBackdropClose = React.useCallback(() => {
    setAllowBackdropClose(true);
  }, []);

  const handleShowShowCloseButton = React.useCallback(() => {
    setShowCloseButton(true);
  }, []);

  const handleHideShowCloseButton = React.useCallback(() => {
    setShowCloseButton(false);
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setModalOpen(open);
    onOpenChangeRef.current?.(open);
  }, []);

  const contextValue = React.useMemo<ModalContextValue>(
    () => ({
      open,
      close,
      reset,
      preventBackdropClose,
      disableBackdropClose,
      handleShowShowCloseButton,
      handleHideShowCloseButton,
    }),
    [
      close,
      disableBackdropClose,
      handleHideShowCloseButton,
      handleShowShowCloseButton,
      open,
      preventBackdropClose,
      reset,
    ],
  );

  return (
    <ModalContext.Provider value={contextValue}>
      <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={showCloseButton}
          onInteractOutside={(e) => !allowBackdropClose && e.preventDefault()}
          onEscapeKeyDown={(e) => !allowBackdropClose && e.preventDefault()}
          onClose={() => reset()}
        >
          {element.header && (
            <DialogHeader className={cn("py-4", element.headerClassName)}>
              {element.header}
            </DialogHeader>
          )}

          {element.content && (
            <div className={cn(element.contentClassName)}>
              {element.content}
            </div>
          )}

          {element.footer && (
            <DialogFooter
              className={cn(
                "border-t bg-muted/50 py-4",
                element.footerClassName,
              )}
            >
              {typeof element.footer === "function"
                ? element.footer({ loading, close, run })
                : element.footer}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = React.useContext(ModalContext);

  if (!context) {
    throw new Error("useModal must be used within ModalProvider");
  }

  return context;
}
