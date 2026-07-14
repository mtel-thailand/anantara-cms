import { createClient } from "@/src/lib/supabase/client";
import { unwrap } from "@/src/lib/supabase/unwrap";
import type { AgendaRecordWithEventsRow, AgendaState } from "../agenda.types";
import {
  agendaPayload,
  eventPayload,
  toAgendaState,
} from "@/src/features/agenda/api/agenda.serializer";

const isTemporaryId = (id: string) => id.startsWith("temp-");

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

  const agendas: AgendaRecordWithEventsRow[] = unwrap(data, error);
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
