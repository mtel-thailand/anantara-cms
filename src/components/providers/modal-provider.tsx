"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/src/components/ui/dialog";
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

const ModalContext = createContext<ModalContextValue | null>(null);

type ModalRun = (action: () => void | Promise<void>) => Promise<void>;

type ModalFooterRenderProps = {
  loading: boolean;
  close: () => void;
  run: ModalRun;
};

type ElementModalType = {
  header?: ReactNode | null;
  className?: string;
  headerClassName?: string;
  content?: ReactNode | null;
  contentClassName?: string;
  footer?:
    | ReactNode
    | ((props: ModalFooterRenderProps) => ReactNode)
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
  children: ReactNode;
}) {
  const [element, setElement] =
    useState<ElementModalType>(defaultElement);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [allowBackdropClose, setAllowBackdropClose] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const runningRef = useRef(false);
  const onOpenChangeRef = useRef<((open: boolean) => void) | null>(null);

  const close = useCallback(() => {
    setModalOpen(false);
    onOpenChangeRef.current?.(false);
  }, []);

  const open = useCallback((elements?: ElementModalType) => {
    if (elements) {
      onOpenChangeRef.current = elements.onOpenChange ?? null;
      setElement({ ...defaultElement, ...elements });
    }
    setModalOpen(true);
  }, []);

  const reset = useCallback(() => {
    setElement(defaultElement);
    onOpenChangeRef.current = null;
    setAllowBackdropClose(true);
    setShowCloseButton(true);
    setLoading(false);
  }, []);

  const run = useCallback<ModalRun>(async (action) => {
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

  const preventBackdropClose = useCallback(() => {
    setAllowBackdropClose(false);
  }, []);

  const disableBackdropClose = useCallback(() => {
    setAllowBackdropClose(true);
  }, []);

  const handleShowShowCloseButton = useCallback(() => {
    setShowCloseButton(true);
  }, []);

  const handleHideShowCloseButton = useCallback(() => {
    setShowCloseButton(false);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setModalOpen(open);
    onOpenChangeRef.current?.(open);
  }, []);

  const contextValue = useMemo<ModalContextValue>(
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
          className={element.className}
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
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error("useModal must be used within ModalProvider");
  }

  return context;
}
