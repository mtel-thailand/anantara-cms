import {
  formatTime,
  hasDuplicateDate,
  setTime,
  toISODate,
} from "@/src/lib/date";
import { AgendaCommand } from "./agenda.commands";
import { AgendaEventType, AgendaItemType, AgendaType } from "./types";

export function sortAgendas(agendas: AgendaType[]) {
  return [...agendas].sort(
    (left, right) =>
      new Date(left.date).getTime() - new Date(right.date).getTime() ||
      left.date.localeCompare(right.date),
  );
}

function sortAgendaEvents(events: AgendaEventType[]) {
  return [...events].sort(
    (left, right) =>
      new Date(left.started_at).getTime() -
        new Date(right.started_at).getTime() ||
      (left.ended_at ?? left.started_at).localeCompare(
        right.ended_at ?? right.started_at,
      ),
  );
}

function buildAgendaEvent(
  agenda: AgendaType,
  item: AgendaItemType,
  existing?: AgendaEventType,
  newEvent?: { id: string; createdAt: string },
): AgendaEventType | null {
  const startedAt = setTime(agenda.date, item.start);
  const endedAt = item.end ? setTime(agenda.date, item.end) : null;
  const identity = existing
    ? { id: existing.id, createdAt: existing.created_at }
    : newEvent;

  if (!identity || !startedAt || (item.end && !endedAt)) return null;

  return {
    ...existing,
    id: identity.id,
    created_at: identity.createdAt,
    agenda_id: agenda.id,
    name: item.name,
    name_it: item.nameIt || null,
    description: item.description,
    description_it: item.descriptionIt || null,
    started_at: startedAt.toISOString(),
    ended_at: endedAt?.toISOString() ?? null,
    app_icon: item.icon,
  };
}

function withoutRemoved<T extends { removed?: boolean }>(value: T): T {
  const restored = { ...value };
  delete restored.removed;
  return restored;
}

export function agendaReducer(
  agendas: AgendaType[],
  command: AgendaCommand,
): AgendaType[] {
  switch (command.type) {
    case "add-date": {
      const calendarDate = toISODate(command.date);
      const zonedDate =
        setTime(calendarDate, "00:00")?.toISOString() ?? command.date;

      if (
        hasDuplicateDate(
          agendas
            .filter((agenda) => !agenda.removed)
            .map((agenda) => agenda.date),
          zonedDate,
        )
      ) {
        return agendas;
      }

      const newAgenda: AgendaType = {
        id: `temp-${zonedDate}`,
        created_at: zonedDate,
        name: zonedDate,
        date: zonedDate,
        events: [],
        seq: 1,
      };

      return sortAgendas([...agendas, newAgenda]).map((agenda, index) => ({
        ...agenda,
        seq: index + 1,
      }));
    }

    case "edit-date": {
      const calendarDate = toISODate(command.date);
      const nextDate =
        setTime(calendarDate, "00:00")?.toISOString() ?? calendarDate;

      return agendas
        .map((agenda) =>
          agenda.id === command.id
            ? {
                ...agenda,
                created_at: nextDate,
                date: nextDate,
                name: nextDate,
                events: agenda.events.map((event) => ({
                  ...event,
                  started_at:
                    setTime(
                      nextDate,
                      formatTime(event.started_at),
                    )?.toISOString() ?? event.started_at,
                  ended_at: event.ended_at
                    ? (setTime(
                        nextDate,
                        formatTime(event.ended_at),
                      )?.toISOString() ?? event.ended_at)
                    : null,
                })),
              }
            : agenda,
        )
        .map((agenda, index) => ({ ...agenda, seq: index + 1 }));
    }

    case "remove-date":
      return agendas.map((agenda) =>
        agenda.id === command.id ? { ...agenda, removed: true } : agenda,
      );

    case "restore-date":
      return agendas.map((agenda) =>
        agenda.id === command.id ? withoutRemoved(agenda) : agenda,
      );

    case "add-event":
      return agendas.map((agenda) => {
        if (agenda.id !== command.item.agendaId) return agenda;

        const event = buildAgendaEvent(agenda, command.item, undefined, {
          id: command.eventId,
          createdAt: command.createdAt,
        });
        return event
          ? { ...agenda, events: sortAgendaEvents([...agenda.events, event]) }
          : agenda;
      });

    case "edit-event":
      return agendas.map((agenda) => {
        if (agenda.id !== command.item.agendaId) return agenda;

        const existing = agenda.events.find(
          (event) => event.id === command.eventId,
        );
        if (!existing) return agenda;

        const updated = buildAgendaEvent(agenda, command.item, existing);
        if (!updated) return agenda;

        return {
          ...agenda,
          events: sortAgendaEvents(
            agenda.events.map((event) =>
              event.id === command.eventId ? updated : event,
            ),
          ),
        };
      });

    case "remove-event":
      return agendas.map((agenda) =>
        agenda.id === command.agendaId
          ? {
              ...agenda,
              events: agenda.events.map((event) =>
                event.id === command.eventId
                  ? { ...event, removed: true }
                  : event,
              ),
            }
          : agenda,
      );

    case "restore-event":
      return agendas.map((agenda) =>
        agenda.id === command.agendaId
          ? {
              ...agenda,
              events: agenda.events.map((event) =>
                event.id === command.eventId ? withoutRemoved(event) : event,
              ),
            }
          : agenda,
      );
  }
}
