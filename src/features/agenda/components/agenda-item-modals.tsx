"use client";

import { FormLanguageToggle } from "@/src/components/form/language-toggle";
import ControlledInput from "@/src/components/form/input";
import ControlledTimePicker from "@/src/components/form/time-picker";
import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import { Label } from "@/src/components/ui/label";
import Text from "@/src/components/ui/text";
import { AGENDA_ICON_LABELS, AGENDA_ICONS } from "@/src/constants/agenda-icons";
import { formatTime } from "@/src/lib/date";
import { eventEmitter } from "@/src/lib/events";
import { cn } from "@/src/lib/utils";
import { Locale } from "@/src/types/locale";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { getAgendaSchema } from "@/src/features/agenda/agenda.schema";
import {
  AgendaEventType,
  AgendaItemFormType,
  agendaEventToFormValues,
} from "@/src/features/agenda/types";
import { AgendaIconGlyph } from "./agenda-icon";

const EMPTY_VALUES: AgendaItemFormType = {
  name: "",
  nameIt: "",
  start: "",
  end: "",
  icon: "",
  description: "",
  descriptionIt: "",
};

const localeFields = {
  en: { name: "name", description: "description" },
  it: { name: "nameIt", description: "descriptionIt" },
} satisfies Record<
  Locale,
  {
    name: keyof AgendaItemFormType;
    description: keyof AgendaItemFormType;
  }
>;

function getDefaultValues(editing: AgendaEventType | null): AgendaItemFormType {
  if (!editing) return EMPTY_VALUES;

  return {
    ...agendaEventToFormValues(editing),
    start: formatTime(editing.started_at),
    end: editing.ended_at ? formatTime(editing.ended_at) : "",
  };
}

function AgendaItemModalContent({
  agendaId,
  editing,
}: {
  agendaId: string;
  editing: AgendaEventType | null;
}) {
  const modal = useModal();
  const t = useTranslations();
  const [currentLocale, setCurrentLocale] = useState<Locale>("en");
  const { control, handleSubmit, formState, watch, setValue } =
    useForm<AgendaItemFormType>({
      defaultValues: getDefaultValues(editing),
      resolver: zodResolver(getAgendaSchema(t)),
      shouldUnregister: false,
      mode: "onSubmit",
      reValidateMode: "onChange",
    });

  const currentFields = localeFields[currentLocale];
  const startTime = watch("start");
  const endTime = watch("end");
  const selectedIcon = watch("icon");
  const name = watch("name");
  const nameIt = watch("nameIt");
  const description = watch("description");
  const descriptionIt = watch("descriptionIt");

  function submit(data: AgendaItemFormType) {
    const item = { agendaId, ...data };

    if (editing) {
      eventEmitter.emit("agenda:command", {
        type: "edit-event",
        eventId: editing.id,
        item,
      });
    } else {
      eventEmitter.emit("agenda:command", {
        type: "add-event",
        eventId: `temp-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        item,
      });
    }

    toast.success(editing ? "Agenda item updated" : "Agenda item added", {
      description: "Remember to publish your changes.",
    });
    modal.close();
  }

  return (
    <form onSubmit={handleSubmit(submit)}>
      <div className="flex flex-col gap-5 overflow-y-auto px-6 pb-5">
        <div className="flex items-center justify-between gap-2">
          <Text>Editing language</Text>
          <FormLanguageToggle
            value={currentLocale}
            onValueChange={setCurrentLocale}
            availability={{
              en: Boolean(name.trim() || description.trim()),
              it: Boolean(nameIt?.trim() || descriptionIt?.trim()),
            }}
          />
        </div>

        <ControlledInput
          control={control}
          name={currentFields.name}
          label="Title"
          required
          error={{
            hasError: Boolean(formState.errors[currentFields.name]),
            message: formState.errors[currentFields.name]?.message,
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label>Start time</Label>
            <ControlledTimePicker
              control={control}
              name="start"
              invalid={Boolean(formState.errors.start)}
              max={endTime}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>End time (optional)</Label>
            <ControlledTimePicker
              control={control}
              name="end"
              invalid={Boolean(formState.errors.end)}
              min={startTime}
            />
          </div>
        </div>

        {formState.errors.end ? (
          <Text size="sm" color="destructive" className="-mt-3">
            {formState.errors.end.message}
          </Text>
        ) : (
          <Text size="xs" color="muted-foreground" className="-mt-3">
            Leave the end time blank for a single moment.
          </Text>
        )}

        <div className="flex flex-col gap-2">
          <Label>Icon</Label>
          <div className="grid grid-cols-4 gap-2">
            {AGENDA_ICONS.map((value) => {
              const selected = selectedIcon === value;

              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setValue("icon", selected ? "" : value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/5 text-primary"
                      : "text-muted-foreground hover:bg-accent",
                    formState.errors.icon && "border-destructive",
                  )}
                >
                  <AgendaIconGlyph icon={value} className="size-6" />
                  {AGENDA_ICON_LABELS[value]}
                </button>
              );
            })}
          </div>
          {formState.errors.icon ? (
            <Text size="sm" color="destructive">
              Select an icon.
            </Text>
          ) : null}
        </div>

        <ControlledInput
          control={control}
          name={currentFields.description}
          label="Location"
          required
          error={{
            hasError: Boolean(formState.errors[currentFields.description]),
            message: formState.errors[currentFields.description]?.message,
          }}
        />
      </div>
      <div className="flex justify-end gap-2 border-t bg-muted/50 px-6 py-4">
        <Button type="button" variant="outline" onClick={modal.close}>
          Cancel
        </Button>
        <Button type="submit">{editing ? "Save item" : "Add item"}</Button>
      </div>
    </form>
  );
}

export function useAgendaItemModal(agendaId: string) {
  const modal = useModal();

  return useCallback(
    (editing: AgendaEventType | null = null) => {
      modal.handleShowShowCloseButton();
      modal.disableBackdropClose();
      modal.open({
        header: (
          <div>
            <Text.FormTitle size="xl">
              {editing ? "Edit agenda item" : "Add agenda item"}
            </Text.FormTitle>
            <Text size="sm" color="muted-foreground">
              A scheduled entry shown under this date on the public agenda.
            </Text>
          </div>
        ),
        content: (
          <AgendaItemModalContent
            key={editing?.id ?? `new-item-${agendaId}`}
            agendaId={agendaId}
            editing={editing}
          />
        ),
      });
    },
    [agendaId, modal],
  );
}
