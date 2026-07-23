import {
  AgendaEventFormType,
  AgendaEventState,
  AgendaRecordWithEventsRow,
  AgendaState,
  EventRow,
} from "../agenda.types";

export function agendaEventToFormValues(
  event: AgendaEventState,
): AgendaEventFormType {
  return {
    name: event.name,
    nameIt: event.nameIt ?? "",
    startedAt: event.startedAt,
    endedAt: event.endedAt ?? "",
    appIcon: event.appIcon ?? "",
    description: event.description ?? "",
    descriptionIt: event.descriptionIt ?? "",
  };
}

function toAgendaEventState(event: EventRow): AgendaEventState {
  return {
    active: event.active,
    agendaId: event.agenda_id,
    appIcon: event.app_icon,
    createdAt: event.created_at,
    description: event.description,
    descriptionIt: event.description_it,
    endedAt: event.ended_at,
    id: event.id,
    name: event.name,
    nameIt: event.name_it,
    remark: event.remark,
    remarkIt: event.remark_it,
    startDateFormat: event.start_date_format,
    startedAt: event.started_at,
  };
}

export function toAgendaState(agenda: AgendaRecordWithEventsRow): AgendaState {
  return {
    id: agenda.id,
    createdAt: agenda.created_at,
    name: agenda.name,
    date: agenda.date,
    seq: agenda.seq,
    events: agenda.events.map(toAgendaEventState),
  };
}

export function agendaPayload(agenda: AgendaState) {
  return {
    name: agenda.name,
    date: agenda.date,
    seq: agenda.seq,
  };
}

export function eventPayload(event: AgendaEventState, agendaId: string) {
  return {
    agenda_id: agendaId,
    name: event.name,
    name_it: event.nameIt ?? null,
    description: event.description,
    description_it: event.descriptionIt ?? null,
    started_at: event.startedAt,
    ended_at: event.endedAt ?? null,
    app_icon: event.appIcon,
  };
}
