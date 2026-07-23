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
import type { Locale } from "@/src/types/locale";
import { enGB, it } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
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
  const currentLocale = useLocale() as Locale;
  const t = useTranslations("agenda.dateModal");
  const commonT = useTranslations("common");
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
      toast.error(
        t("alreadyExists", { date: formatLongDate(iso, currentLocale) }),
      );
      return;
    }

    if (editing) {
      if (!isSameDate(iso, editing.date)) {
        eventEmitter.emit("agenda:command", {
          type: "edit-date",
          id: editing.id,
          date: iso,
        });
        toast.success(
          t("changed", { date: formatLongDate(iso, currentLocale) }),
          {
            description: t("publishReminder"),
          },
        );
      }
    } else {
      eventEmitter.emit("agenda:command", { type: "add-date", date: iso });
      toast.success(t("added", { date: formatLongDate(iso, currentLocale) }), {
        description: t("publishReminder"),
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
          locale={currentLocale === "it" ? it : enGB}
        />
      </div>
      <div className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-4">
        <Button variant="outline" onClick={modal.close}>
          {commonT("cancel")}
        </Button>
        <Button onClick={submit} disabled={!selected}>
          {editing ? t("save") : t("addTitle")}
        </Button>
      </div>
    </>
  );
}

export function useAgendaDateModal(usedDates: string[]) {
  const modal = useModal();
  const t = useTranslations("agenda.dateModal");

  return useCallback(
    (editing: EditingDate = null) => {
      modal.handleShowShowCloseButton();
      modal.disableBackdropClose();
      modal.open({
        header: (
          <>
            <Text.FormTitle size="xl">
              {editing ? t("editTitle") : t("addTitle")}
            </Text.FormTitle>
            <Text size="sm" color="muted-foreground">
              {editing
                ? t("editDescription")
                : t("addDescription")}
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
    [modal, t, usedDates],
  );
}
