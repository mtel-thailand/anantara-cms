"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Textarea } from "@/src/components/ui/textarea";
import Text from "@/src/components/ui/text";
import { formatDate } from "@/src/lib/date";
import { logger } from "@/src/lib/logger";
import type { OwnerReservationDetail } from "@/src/features/cars/reservation/list/owner-reservation-list.types";

type OwnerRequestInfoModalState = {
  composerOpen: boolean;
  message: string;
};

export function createOwnerRequestInfoModalStore() {
  let state: OwnerRequestInfoModalState = {
    composerOpen: false,
    message: "",
  };
  const listeners = new Set<() => void>();

  function update(nextState: Partial<OwnerRequestInfoModalState>) {
    state = { ...state, ...nextState };
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot: () => state,
    openComposer: () => update({ composerOpen: true }),
    setMessage: (message: string) => update({ message }),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type OwnerRequestInfoModalStore = ReturnType<
  typeof createOwnerRequestInfoModalStore
>;

function useOwnerRequestInfoModalState(store: OwnerRequestInfoModalStore) {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}

export function OwnerRequestInfoModal({
  reservation,
  store,
}: {
  reservation: OwnerReservationDetail;
  store: OwnerRequestInfoModalStore;
}) {
  const t = useTranslations("cars.reservation.list");
  const { composerOpen, message } = useOwnerRequestInfoModalState(store);
  const showComposer = reservation.infoRequests.length === 0 || composerOpen;

  return (
    <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto px-4 pb-4">
      {reservation.infoRequests.map((request) => (
        <div key={request.id} className="flex flex-col gap-1">
          <Textarea
            value={request.message}
            rows={3}
            disabled
            className="resize-none bg-muted/40 disabled:cursor-default disabled:opacity-100"
          />
          <Text size="xs" color="muted-foreground">
            {t("sent", { date: formatDate(request.sentDate) })}
          </Text>
        </div>
      ))}

      {showComposer ? (
        <div className="flex flex-col gap-1.5">
          <Textarea
            label={reservation.infoRequests.length ? t("newMessage") : undefined}
            value={message}
            onChange={(event) => store.setMessage(event.target.value)}
            rows={5}
            placeholder={t("composerPlaceholder")}
          />
          <Text size="xs" color="muted-foreground">
            {t("linkAdded")}
          </Text>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={store.openComposer}
        >
          <Plus className="size-4" /> {t("requestMoreInfo")}
        </Button>
      )}
    </div>
  );
}

export function OwnerRequestInfoModalFooter({
  close,
  loading,
  onSend,
  reservation,
  run,
  store,
}: {
  close: () => void;
  loading: boolean;
  onSend: (message: string) => Promise<{ emailSent: boolean }>;
  reservation: OwnerReservationDetail;
  run: (action: () => void | Promise<void>) => Promise<void>;
  store: OwnerRequestInfoModalStore;
}) {
  const t = useTranslations("cars.reservation.list");
  const commonT = useTranslations("common");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const { composerOpen, message } = useOwnerRequestInfoModalState(store);
  const showComposer = reservation.infoRequests.length === 0 || composerOpen;

  async function handleSend() {
    const nextMessage = message.trim();
    if (!nextMessage) return;

    try {
      const { emailSent } = await onSend(nextMessage);
      if (emailSent) {
        toast.success(t("requestSuccess"), {
          description: t("requestSuccessDescription"),
        });
      } else {
        toast.warning(t("requestWarning"), {
          description: t("requestWarningDescription"),
        });
      }
      setConfirmationOpen(false);
      close();
    } catch (error) {
      logger.error("OWNER-RESERVATIONS", "Failed to request information", {
        error: error instanceof Error ? error.message : String(error),
        reservationId: reservation.id,
      });
      toast.error(t("requestError"), {
        description: t("tryAgain"),
      });
    }
  }

  return (
    <>
      <Button variant="outline" disabled={loading} onClick={close}>
        {commonT("cancel")}
      </Button>
      <Button
        disabled={!showComposer || !message.trim()}
        onClick={() => setConfirmationOpen(true)}
      >
        {t("sendEmail")}
      </Button>
      <Dialog
        open={confirmationOpen}
        onOpenChange={(open) => {
          if (!loading) setConfirmationOpen(open);
        }}
      >
        <DialogContent
          className="max-w-sm gap-0 overflow-hidden p-0"
          showCloseButton={false}
          onInteractOutside={(event) => {
            if (loading) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (loading) event.preventDefault();
          }}
        >
          <DialogHeader className="border-0 px-4 py-4">
            <DialogTitle className="font-heading text-base font-normal leading-normal">
              {t("sendConfirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("sendConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t bg-muted/50 px-4 py-4">
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => setConfirmationOpen(false)}
            >
              {commonT("cancel")}
            </Button>
            <Button loading={loading} onClick={() => void run(handleSend)}>
              {t("sendEmail")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
