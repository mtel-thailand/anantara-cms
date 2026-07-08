import { createClient } from "@/src/lib/supabase/client";
import { unwrap } from "@/src/lib/supabase/unwrap";
import type {
  AgendaEventState,
  AgendaRow,
  AgendaState,
  EventRow,
} from "./types";

type AgendaRecordWithEvents = AgendaRow & {
  events: EventRow[];
};

const isTemporaryId = (id: string) => id.startsWith("temp-");

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

function toAgendaState(agenda: AgendaRecordWithEvents): AgendaState {
  return {
    id: agenda.id,
    createdAt: agenda.created_at,
    name: agenda.name,
    date: agenda.date,
    seq: agenda.seq,
    events: agenda.events.map(toAgendaEventState),
  };
}

function agendaPayload(agenda: AgendaState) {
  return {
    name: agenda.name,
    date: agenda.date,
    seq: agenda.seq,
  };
}

function eventPayload(event: AgendaEventState, agendaId: string) {
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

function throwIfError(error: unknown) {
  if (error) throw error;
}

function ensureAffected(
  data: { id: string } | null,
  error: unknown,
  label: string,
) {
  throwIfError(error);
  if (!data) throw new Error(`${label} was not found or could not be changed.`);
}

export const getAgendas = async (): Promise<AgendaState[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agendas")
    .select(
      `
        *,
        events (
            *
        )
    `,
    )
    .order("date", { ascending: true });

  const agendas: AgendaRecordWithEvents[] = unwrap(data, error);
  return agendas.map(toAgendaState);
};

export const saveAgendas = async (
  agendas: AgendaState[],
): Promise<AgendaState[]> => {
  const supabase = createClient();

  for (const agenda of agendas) {
    const newAgenda = isTemporaryId(agenda.id);

    if (agenda.removed) {
      if (!newAgenda) {
        const { error: eventsError } = await supabase
          .from("events")
          .delete()
          .eq("agenda_id", agenda.id);
        throwIfError(eventsError);

        const { data, error: agendaError } = await supabase
          .from("agendas")
          .delete()
          .eq("id", agenda.id)
          .select("id")
          .maybeSingle();

        ensureAffected(data, agendaError, "Agenda");
      }
      continue;
    }

    let agendaId = agenda.id;

    if (newAgenda) {
      const { data, error } = await supabase
        .from("agendas")
        .insert(agendaPayload(agenda))
        .select("id")
        .single();

      agendaId = unwrap(data, error).id;
    } else {
      const { data, error } = await supabase
        .from("agendas")
        .update(agendaPayload(agenda))
        .eq("id", agenda.id)
        .select("id")
        .maybeSingle();

      ensureAffected(data, error, "Agenda");
    }

    for (const event of agenda.events) {
      const newEvent = isTemporaryId(event.id);

      if (event.removed) {
        if (!newEvent) {
          const { data, error } = await supabase
            .from("events")
            .delete()
            .eq("id", event.id)
            .select("id")
            .maybeSingle();
          ensureAffected(data, error, "Agenda event");
        }
        continue;
      }

      if (newEvent) {
        const { error } = await supabase
          .from("events")
          .insert(eventPayload(event, agendaId));
        throwIfError(error);
      } else {
        const { data, error } = await supabase
          .from("events")
          .update(eventPayload(event, agendaId))
          .eq("id", event.id)
          .select("id")
          .maybeSingle();
        ensureAffected(data, error, "Agenda event");
      }
    }
  }

  return getAgendas();
};
