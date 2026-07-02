"use client";

import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import { Calendar } from "@/src/components/ui/calendar";
import Text from "@/src/components/ui/text";
import dayjs from "@/src/lib/dayjs";
import {
  formatLongDate,
  hasDuplicateDate,
  isSameDate,
  toISODate,
} from "@/src/lib/date";
import { eventEmitter } from "@/src/lib/events";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

type EditingDate = { id: string; date: string } | null;

function DateModalContent({
  usedDates,
  editing,
}: {
  usedDates: string[];
  editing: EditingDate;
}) {
  const modal = useModal();
  const [selected, setSelected] = useState<Date | undefined>(() =>
    editing?.date ? dayjs(editing.date).toDate() : undefined,
  );
  const used = useMemo(
    () => usedDates.filter((date) => !isSameDate(date, editing?.date)),
    [editing?.date, usedDates],
  );

  function submit() {
    if (!selected) return;

    const iso = toISODate(selected);

    if (hasDuplicateDate(used, iso)) {
      toast.error(`${formatLongDate(iso)} already exists`);
      return;
    }

    if (editing) {
      if (!isSameDate(iso, editing.date)) {
        eventEmitter.emit("agenda:command", {
          type: "edit-date",
          id: editing.id,
          date: iso,
        });
        toast.success(`Date changed to ${formatLongDate(iso)}`, {
          description: "Remember to publish your changes.",
        });
      }
    } else {
      eventEmitter.emit("agenda:command", { type: "add-date", date: iso });
      toast.success(`${formatLongDate(iso)} added`, {
        description: "Remember to publish your changes.",
      });
    }

    modal.close();
  }

  return (
    <>
      <div className="flex justify-center px-4 pb-4">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          disabled={(date) => hasDuplicateDate(used, date)}
          defaultMonth={selected}
        />
      </div>
      <div className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-4">
        <Button variant="outline" onClick={modal.close}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!selected}>
          {editing ? "Save date" : "Add date"}
        </Button>
      </div>
    </>
  );
}

export function useAgendaDateModal(usedDates: string[]) {
  const modal = useModal();

  return useCallback(
    (editing: EditingDate = null) => {
      modal.handleShowShowCloseButton();
      modal.disableBackdropClose();
      modal.open({
        header: (
          <>
            <Text.FormTitle size="xl">
              {editing ? "Edit date" : "Add date"}
            </Text.FormTitle>
            <Text size="sm" color="muted-foreground">
              {editing
                ? "Pick a new day for this table. Dates already in the agenda are disabled — each date can be used once."
                : "Pick a day to add to the schedule. Dates already in the agenda are disabled — each date can be added once."}
            </Text>
          </>
        ),
        content: (
          <DateModalContent
            key={editing?.id ?? "new-date"}
            usedDates={usedDates}
            editing={editing}
          />
        ),
      });
    },
    [modal, usedDates],
  );
}
