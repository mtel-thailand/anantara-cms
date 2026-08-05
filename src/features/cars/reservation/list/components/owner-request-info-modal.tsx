"use client";

import { Plus } from "lucide-react";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import Text from "@/src/components/ui/text";
import { formatDate } from "@/src/lib/date";
import { logger } from "@/src/lib/logger";
import type { OwnerReservationDetail } from "../owner-reservation-list.types";

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
            Sent {formatDate(request.sentDate)}
          </Text>
        </div>
      ))}

      {showComposer ? (
        <Textarea
          label={reservation.infoRequests.length ? "New message" : undefined}
          value={message}
          onChange={(event) => store.setMessage(event.target.value)}
          rows={5}
          placeholder="Write the email to the owner — e.g. “Please fill in the attached form so we can confirm your participation.”"
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={store.openComposer}
        >
          <Plus className="size-4" /> Request more info
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
  const { composerOpen, message } = useOwnerRequestInfoModalState(store);
  const showComposer = reservation.infoRequests.length === 0 || composerOpen;

  async function handleSend() {
    const nextMessage = message.trim();
    if (!nextMessage) return;

    try {
      const { emailSent } = await onSend(nextMessage);
      if (emailSent) {
        toast.success("Information requested", {
          description: "The request was saved and emailed to the owner.",
        });
      } else {
        toast.warning("Request saved, but the email wasn’t sent", {
          description: "Check the email configuration before trying again.",
        });
      }
      close();
    } catch (error) {
      logger.error("OWNER-RESERVATIONS", "Failed to request information", {
        error: error instanceof Error ? error.message : String(error),
        reservationId: reservation.id,
      });
      toast.error("Couldn’t save the information request", {
        description: "Please try again.",
      });
    }
  }

  return (
    <>
      <Button variant="outline" disabled={loading} onClick={close}>
        Cancel
      </Button>
      <Button
        loading={loading}
        disabled={!showComposer || !message.trim()}
        onClick={() => void run(handleSend)}
      >
        Send email
      </Button>
    </>
  );
}
