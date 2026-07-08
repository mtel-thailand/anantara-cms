import {
  formatTime,
  hasDuplicateDate,
  setTime,
  toISODate,
} from "@/src/lib/date";
import { AgendaCommand } from "./agenda.commands";
import { AgendaEventState, AgendaEventInput, AgendaState } from "./types";

function agendaDate(agenda: AgendaState) {
  return agenda.date ?? agenda.createdAt;
}

export function sortAgendas(agendas: AgendaState[]) {
  return [...agendas].sort(
    (left, right) =>
      new Date(agendaDate(left)).getTime() -
        new Date(agendaDate(right)).getTime() ||
      agendaDate(left).localeCompare(agendaDate(right)),
  );
}

function sortAgendaEvents(events: AgendaEventState[]) {
  return [...events].sort(
    (left, right) =>
      new Date(left.startedAt).getTime() -
        new Date(right.startedAt).getTime() ||
      (left.endedAt ?? left.startedAt).localeCompare(
        right.endedAt ?? right.startedAt,
      ),
  );
}

function buildAgendaEvent(
  agenda: AgendaState,
  item: AgendaEventInput,
  existing?: AgendaEventState,
  newEvent?: { id: string; createdAt: string },
): AgendaEventState | null {
  const startedAt = setTime(agendaDate(agenda), item.startedAt);
  const endedAt = item.endedAt
    ? setTime(agendaDate(agenda), item.endedAt)
    : null;
  const identity = existing
    ? { id: existing.id, createdAt: existing.createdAt }
    : newEvent;

  if (!identity || !startedAt || (item.endedAt && !endedAt)) return null;

  return {
    active: existing?.active ?? null,
    remark: existing?.remark ?? null,
    remarkIt: existing?.remarkIt ?? null,
    startDateFormat: existing?.startDateFormat ?? null,
    id: identity.id,
    createdAt: identity.createdAt,
    agendaId: agenda.id,
    name: item.name,
    nameIt: item.nameIt || null,
    description: item.description,
    descriptionIt: item.descriptionIt || null,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt?.toISOString() ?? null,
    appIcon: item.appIcon,
  };
}

function withoutRemoved<T extends { removed?: boolean }>(value: T): T {
  const restored = { ...value };
  delete restored.removed;
  return restored;
}

export function agendaReducer(
  agendas: AgendaState[],
  command: AgendaCommand,
): AgendaState[] {
  switch (command.type) {
    case "add-date": {
      const calendarDate = toISODate(command.date);
      const zonedDate =
        setTime(calendarDate, "00:00")?.toISOString() ?? command.date;

      if (
        hasDuplicateDate(
          agendas.filter((agenda) => !agenda.removed).map(agendaDate),
          zonedDate,
        )
      ) {
        return agendas;
      }

      const newAgenda: AgendaState = {
        id: `temp-${zonedDate}`,
        createdAt: zonedDate,
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
                createdAt: nextDate,
                date: nextDate,
                name: nextDate,
                events: agenda.events.map((event) => ({
                  ...event,
                  startedAt:
                    setTime(
                      nextDate,
                      formatTime(event.startedAt),
                    )?.toISOString() ?? event.startedAt,
                  endedAt: event.endedAt
                    ? (setTime(
                        nextDate,
                        formatTime(event.endedAt),
                      )?.toISOString() ?? event.endedAt)
                    : null,
                })),
              }
            : agenda,
        )
        .map((agenda, index) => ({ ...agenda, seq: index + 1 }));
    }

    case "remove-date": {
      const target = agendas.find((agenda) => agenda.id === command.id);
      if (!target) return agendas;

      if (target.id.startsWith("temp-")) {
        return agendas
          .filter((agenda) => agenda.id !== command.id)
          .map((agenda, index) => ({ ...agenda, seq: index + 1 }));
      }

      return agendas.map((agenda) =>
        agenda.id === command.id ? { ...agenda, removed: true } : agenda,
      );
    }

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
      return agendas.map((agenda) => {
        if (agenda.id !== command.agendaId) {
          return agenda;
        }

        const targetEvent = agenda.events.find(
          (event) => event.id === command.eventId,
        );

        if (!targetEvent) {
          return agenda;
        }

        const events = targetEvent.id.startsWith("temp-")
          ? agenda.events.filter((event) => event.id !== command.eventId)
          : agenda.events.map((event) =>
              event.id === command.eventId
                ? { ...event, removed: true }
                : event,
            );

        return {
          ...agenda,
          events,
        };
      });

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
