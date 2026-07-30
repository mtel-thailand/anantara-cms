"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import Text from "@/src/components/ui/text";
import useAsync from "@/src/hooks/use-async";
import { formatDate } from "@/src/lib/date";
import { logger } from "@/src/lib/logger";
import type { OwnerReservationDetail } from "../owner-reservation-list.types";

export function OwnerRequestInfoModal({
  reservation,
  onSend,
}: {
  reservation: OwnerReservationDetail;
  onSend: (message: string) => Promise<void>;
}) {
  const modal = useModal();
  const [message, setMessage] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const { isLoading, execute } = useAsync();
  const showComposer = reservation.infoRequests.length === 0 || composerOpen;

  async function handleSend() {
    const nextMessage = message.trim();
    if (!nextMessage || isLoading) return;

    try {
      await execute(onSend, nextMessage);
      toast.success("Information requested", {
        description: "The request was saved and the status changed to Requested.",
      });
      modal.close();
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
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            placeholder="Write the request for the owner…"
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setComposerOpen(true)}
          >
            <Plus className="size-4" /> Request more info
          </Button>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-4">
        <Button variant="outline" disabled={isLoading} onClick={modal.close}>
          Cancel
        </Button>
        <Button
          loading={isLoading}
          disabled={!showComposer || !message.trim()}
          onClick={() => void handleSend()}
        >
          Send request
        </Button>
      </div>
    </>
  );
}
