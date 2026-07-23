import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import ClientSideDraggableTable from "@/src/components/ui/table/client-side-custom-table";
import Text from "@/src/components/ui/text";
import { AGENDA_ICONS, AgendaIcon } from "@/src/constants/agenda-icons";
import { formatLongDate, formatTimeRange, toISODate } from "@/src/lib/date";
import { eventEmitter } from "@/src/lib/events";
import { cn } from "@/src/lib/utils";
import { useModal } from "@/src/components/providers/modal-provider";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";
import { memo, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { AgendaEventState, AgendaState } from "@/src/features/agenda/agenda.types";
import { useAgendaItemModal } from "@/src/features/agenda/components/agenda-item-modals";
import { AgendaIconGlyph } from "@/src/features/agenda/components/agenda-icon";
import {
  agendaEventLanguageStatus,
  hasAgendaLanguageGap,
} from "@/src/features/agenda/agenda.helpers";

type EventTableType = {
  id: string;
  event: AgendaEventState;
  time: string;
  icon: string;
  title: string;
  location: string;
  languages: { en: boolean; it: boolean };
  isDraft: boolean;
};

function isAgendaIcon(value: string): value is AgendaIcon {
  return AGENDA_ICONS.includes(value as AgendaIcon);
}

function localizedValue(
  primary: string | null | undefined,
  fallback: string | null | undefined,
) {
  return primary?.trim() || fallback?.trim() || "—";
}

const AgendaTable = memo(function AgendaTable({
  agenda,
  publishedAgenda,
  prioritizeGaps,
  duplicate,
  onEditDate,
}: {
  agenda: AgendaState;
  publishedAgenda?: AgendaState;
  prioritizeGaps: boolean;
  duplicate: boolean;
  onEditDate: (agenda: AgendaState) => void;
}) {
  const modal = useModal();
  const currentLocale = useLocale();
  const openAgendaItemModal = useAgendaItemModal(agenda.id);

  const sortedEvents = useMemo(() => {
    const byTime = [...agenda.events].sort(
      (left, right) =>
        new Date(left.startedAt).getTime() -
        new Date(right.startedAt).getTime(),
    );

    if (!prioritizeGaps) return byTime;

    return byTime.sort(
      (left, right) =>
        Number(hasAgendaLanguageGap(right)) -
        Number(hasAgendaLanguageGap(left)),
    );
  }, [agenda.events, prioritizeGaps]);

  const data = useMemo<EventTableType[]>(
    () =>
      sortedEvents.map((event) => {
        const publishedEvent = publishedAgenda?.events.find(
          (published) => published.id === event.id,
        );
        const italian = currentLocale === "it";

        return {
          id: event.id,
          event,
          time: formatTimeRange(event.startedAt, event.endedAt),
          icon: event.appIcon ?? "",
          title: localizedValue(
            italian ? event.nameIt : event.name,
            italian ? event.name : event.nameIt,
          ),
          location: localizedValue(
            italian ? event.descriptionIt : event.description,
            italian ? event.description : event.descriptionIt,
          ),
          languages: agendaEventLanguageStatus(event),
          isDraft:
            !event.removed &&
            (!publishedEvent ||
              JSON.stringify(publishedEvent) !== JSON.stringify(event)),
        };
      }),
    [currentLocale, publishedAgenda, sortedEvents],
  );

  const closeModal = useCallback(() => {
    modal.reset();
    modal.close();
  }, [modal]);

  const removeItem = useCallback(
    (event: AgendaEventState) => {
      modal.open({
        header: (
          <Text.FormTitle size="base" className="font-medium">
            Remove {localizedValue(event.name, event.nameIt)}?
          </Text.FormTitle>
        ),
        contentClassName: "px-4",
        content: (
          <Text size="sm" color="muted-foreground">
            This item will be marked for removal. You can restore it before
            publishing.
          </Text>
        ),
        footer: (
          <>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                eventEmitter.emit("agenda:command", {
                  type: "remove-event",
                  agendaId: agenda.id,
                  eventId: event.id,
                });
                toast.success("Agenda item marked for removal");
                closeModal();
              }}
            >
              Remove
            </Button>
          </>
        ),
      });
    },
    [agenda.id, closeModal, modal],
  );

  const columns = useMemo<ColumnDef<EventTableType, unknown>[]>(
    () => [
      {
        accessorKey: "time",
        header: "Time",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {row.original.time}
          </span>
        ),
      },
      {
        accessorKey: "icon",
        header: "Icon",
        cell: ({ row }) =>
          isAgendaIcon(row.original.icon) ? (
            <AgendaIconGlyph
              icon={row.original.icon}
              className="size-5 text-muted-foreground"
            />
          ) : (
            <Text color="muted-foreground">-</Text>
          ),
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "font-medium",
                row.original.event.removed && "line-through",
              )}
            >
              {row.original.title}
            </span>
            {row.original.event.removed && (
              <Badge
                variant="outline"
                className="border-destructive/30 bg-destructive/5 text-destructive"
              >
                Will remove
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.location}</span>
        ),
      },
      {
        accessorKey: "languages",
        header: "Languages",
        cell: ({ row }) => (
          <div className="flex gap-1">
            {(["en", "it"] as const).map((locale) => (
              <Badge
                key={locale}
                variant="outline"
                className={cn(
                  "rounded-sm border px-1 py-px text-[10px] font-medium uppercase tracking-wide",
                  row.original.languages[locale]
                    ? "border-transparent bg-secondary text-secondary-foreground"
                    : "border-dashed border-border text-muted-foreground/60",
                )}
              >
                {locale}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const event = row.original.event;

          if (agenda.removed) {
            return <div className="text-right text-muted-foreground">—</div>;
          }

          if (event.removed) {
            return (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    eventEmitter.emit("agenda:command", {
                      type: "restore-event",
                      agendaId: agenda.id,
                      eventId: event.id,
                    });
                    toast.success("Agenda item restored");
                  }}
                >
                  <RotateCcw className="size-3.5" /> Restore
                </Button>
              </div>
            );
          }

          return (
            <div className="flex items-center justify-end gap-1">
              {row.original.isDraft && (
                <Badge
                  variant="outline"
                  className="h-fit border-primary/30 bg-primary/5 text-primary"
                >
                  Draft
                </Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${row.original.title}`}
                onClick={() => openAgendaItemModal(event)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${row.original.title}`}
                onClick={() => removeItem(event)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [agenda.id, agenda.removed, openAgendaItemModal, removeItem],
  );

  const handleReorder = useCallback(() => {}, []);
  const getRowClassName = useCallback(
    (row: EventTableType) => (row.event.removed ? "opacity-60" : undefined),
    [],
  );
  const handleEditDate = useCallback(
    () => onEditDate(agenda),
    [agenda, onEditDate],
  );

  const handleRemoveDate = useCallback(() => {
    modal.open({
      headerClassName: "border-b-0 px-4 !pb-0",
      header: (
        <Text.FormTitle size="base" className="font-medium">
          Remove {formatLongDate(agenda.date)}?
        </Text.FormTitle>
      ),
      contentClassName: "px-4",
      content: (
        <Text size="sm" color="muted-foreground">
          The date and all its agenda items will be marked for removal and
          disappear from the website when you publish. You can restore it until
          then.
        </Text>
      ),
      footer: (
        <>
          <Button variant="outline" onClick={closeModal}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              eventEmitter.emit("agenda:command", {
                type: "remove-date",
                id: agenda.id,
              });
              toast.success("Date marked for removal");
              closeModal();
            }}
          >
            Remove
          </Button>
        </>
      ),
    });
  }, [agenda.date, agenda.id, closeModal, modal]);

  const dateLabel = formatLongDate(toISODate(agenda.date ?? agenda.createdAt));

  return (
    <Card
      className={cn(
        "flex flex-col gap-0 overflow-hidden rounded-lg bg-card text-sm text-muted-foreground",
        agenda.removed && "opacity-60",
        duplicate && "border-destructive/50",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Text.FormTitle
            size="lg"
            className={cn(agenda.removed && "line-through")}
          >
            {dateLabel}
          </Text.FormTitle>
          {agenda.removed ? (
            <Badge variant="outline" className="text-muted-foreground">
              Will remove
            </Badge>
          ) : duplicate ? (
            <Badge
              variant="outline"
              className="border-destructive/30 bg-destructive/5 text-destructive"
            >
              Duplicate date
            </Badge>
          ) : (
            <Text size="xs" color="muted-foreground">
              {agenda.events.length}{" "}
              {agenda.events.length === 1 ? "item" : "items"}
            </Text>
          )}
        </div>
        <div className="flex items-center gap-2">
          {agenda.removed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                eventEmitter.emit("agenda:command", {
                  type: "restore-date",
                  id: agenda.id,
                })
              }
            >
              <RotateCcw className="size-3.5" /> Restore date
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAgendaItemModal()}
              >
                <Plus className="size-3.5" /> Add agenda
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit date ${dateLabel}`}
                onClick={handleEditDate}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${dateLabel}`}
                onClick={handleRemoveDate}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <ClientSideDraggableTable<EventTableType>
        data={data}
        columns={columns}
        onReorder={handleReorder}
        getRowClassName={getRowClassName}
        emptyRow={
          <div className="flex h-20 items-center justify-center px-4 text-center text-sm text-muted-foreground">
            No agenda items yet. Use “Add agenda” to add the first one.
          </div>
        }
      />
    </Card>
  );
});

AgendaTable.displayName = "AgendaTable";

export default AgendaTable;
