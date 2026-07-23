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
import { useCallback, useState } from "react";
import { useForm, type SubmitErrorHandler } from "react-hook-form";
import { toast } from "sonner";
import { getAgendaSchema } from "@/src/features/agenda/agenda.schema";
import {
  AgendaEventState,
  AgendaEventFormType,
} from "@/src/features/agenda/agenda.types";
import { AgendaIconGlyph } from "@/src/features/agenda/components/agenda-icon";
import { agendaEventToFormValues } from "@/src/features/agenda/api/agenda.serializer";
import { useTranslations } from "next-intl";

const EMPTY_VALUES: AgendaEventFormType = {
  name: "",
  nameIt: "",
  startedAt: "",
  endedAt: "",
  appIcon: "",
  description: "",
  descriptionIt: "",
};

const localeFields = {
  en: { name: "name", description: "description" },
  it: { name: "nameIt", description: "descriptionIt" },
} satisfies Record<
  Locale,
  {
    name: keyof AgendaEventFormType;
    description: keyof AgendaEventFormType;
  }
>;

function getDefaultValues(
  editing: AgendaEventState | null,
): AgendaEventFormType {
  if (!editing) return EMPTY_VALUES;

  return {
    ...agendaEventToFormValues(editing),
    startedAt: formatTime(editing.startedAt),
    endedAt: editing.endedAt ? formatTime(editing.endedAt) : "",
  };
}

function AgendaItemModalContent({
  agendaId,
  editing,
}: {
  agendaId: string;
  editing: AgendaEventState | null;
}) {
  const modal = useModal();
  const t = useTranslations("agenda.itemModal");
  const validationT = useTranslations("agenda.validation");
  const commonT = useTranslations("common");
  const [currentLocale, setCurrentLocale] = useState<Locale>("en");
  const { control, handleSubmit, formState, watch, setValue } =
    useForm<AgendaEventFormType>({
      defaultValues: getDefaultValues(editing),
      resolver: zodResolver(getAgendaSchema(validationT)),
      shouldUnregister: false,
      mode: "onSubmit",
      reValidateMode: "onChange",
    });

  const currentFields = localeFields[currentLocale];
  const startTime = watch("startedAt");
  const endTime = watch("endedAt");
  const selectedIcon = watch("appIcon");
  const name = watch("name");
  const nameIt = watch("nameIt");
  const description = watch("description");
  const descriptionIt = watch("descriptionIt");

  function submit(data: AgendaEventFormType) {
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

    toast.success(editing ? t("updated") : t("added"), {
      description: t("publishReminder"),
    });
    modal.close();
  }

  const handleInvalid: SubmitErrorHandler<AgendaEventFormType> = (errors) => {
    if (errors.name || errors.description) {
      setCurrentLocale("en");
      return;
    }

    if (errors.nameIt || errors.descriptionIt) {
      setCurrentLocale("it");
    }
  };

  return (
    <form onSubmit={handleSubmit(submit, handleInvalid)}>
      <div className="flex flex-col gap-5 overflow-y-auto px-6 pb-5">
        <div className="flex items-center justify-between gap-2">
          <Text>{t("editingLanguage")}</Text>
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
          label={t("title")}
          required={currentLocale === "en"}
          error={{
            hasError: Boolean(formState.errors[currentFields.name]),
            message: formState.errors[currentFields.name]?.message,
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("startTime")}</Label>
            <ControlledTimePicker
              control={control}
              name="startedAt"
              invalid={Boolean(formState.errors.startedAt)}
              max={endTime}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("endTime")}</Label>
            <ControlledTimePicker
              control={control}
              name="endedAt"
              invalid={Boolean(formState.errors.endedAt)}
              min={startTime}
            />
          </div>
        </div>

        {formState.errors.endedAt ? (
          <Text size="sm" color="destructive" className="-mt-3">
            {formState.errors.endedAt.message}
          </Text>
        ) : (
          <Text size="xs" color="muted-foreground" className="-mt-3">
            {t("endTimeHint")}
          </Text>
        )}

        <div className="flex flex-col gap-2">
          <Label>{t("icon")}</Label>
          <div className="grid grid-cols-4 gap-2">
            {AGENDA_ICONS.map((value) => {
              const selected = selectedIcon === value;

              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setValue("appIcon", selected ? "" : value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/5 text-primary"
                      : "text-muted-foreground hover:bg-accent",
                    formState.errors.appIcon && "border-destructive",
                  )}
                >
                  <AgendaIconGlyph icon={value} className="size-6" />
                  {AGENDA_ICON_LABELS[value]}
                </button>
              );
            })}
          </div>
          {formState.errors.appIcon ? (
            <Text size="sm" color="destructive">
              {validationT("icon")}
            </Text>
          ) : null}
        </div>

        <ControlledInput
          control={control}
          name={currentFields.description}
          label={t("location")}
          required={currentLocale === "en"}
          error={{
            hasError: Boolean(formState.errors[currentFields.description]),
            message: formState.errors[currentFields.description]?.message,
          }}
        />
      </div>
      <div className="flex justify-end gap-2 border-t bg-muted/50 px-6 py-4">
        <Button type="button" variant="outline" onClick={modal.close}>
          {commonT("cancel")}
        </Button>
        <Button type="submit">{editing ? t("save") : t("add")}</Button>
      </div>
    </form>
  );
}

export function useAgendaItemModal(agendaId: string) {
  const modal = useModal();
  const t = useTranslations("agenda.itemModal");

  return useCallback(
    (editing: AgendaEventState | null = null) => {
      modal.handleShowShowCloseButton();
      modal.disableBackdropClose();
      modal.open({
        headerClassName: "px-6 py-4 border-b",
        header: (
          <div>
            <Text.FormTitle size="xl">
              {editing ? t("editTitle") : t("addTitle")}
            </Text.FormTitle>
            <Text size="sm" color="muted-foreground">
              {t("description")}
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
    [agendaId, modal, t],
  );
}
