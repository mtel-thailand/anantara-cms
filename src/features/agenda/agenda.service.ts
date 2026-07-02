import { createClient } from "@/src/lib/supabase/client";
import { AgendaEventType, AgendaType } from "./types";
import { unwrap } from "@/src/lib/supabase/unwrap";

const isTemporaryId = (id: string) => id.startsWith("temp-");

function agendaPayload(agenda: AgendaType) {
  return {
    name: agenda.name,
    date: agenda.date,
    seq: agenda.seq,
  };
}

function eventPayload(event: AgendaEventType, agendaId: string) {
  return {
    agenda_id: agendaId,
    name: event.name,
    name_it: event.name_it ?? null,
    description: event.description,
    description_it: event.description_it ?? null,
    started_at: event.started_at,
    ended_at: event.ended_at ?? null,
    app_icon: event.app_icon,
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

export const getAgendas = async (): Promise<AgendaType[]> => {
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

  return unwrap(data, error);
};

export const saveAgendas = async (
  agendas: AgendaType[],
): Promise<AgendaType[]> => {
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
