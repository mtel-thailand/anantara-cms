import { CamelCasedPropertiesDeep } from "@/src/types/common";
import type { Database } from "@/src/types/database.types";

export type AgendaRow = Database["public"]["Tables"]["agendas"]["Row"];
export type AgendaInsert = Database["public"]["Tables"]["agendas"]["Insert"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type EventInsert = Database["public"]["Tables"]["events"]["Insert"];

type AgendaStateRow = CamelCasedPropertiesDeep<AgendaRow>;
type AgendaEventStateRow = CamelCasedPropertiesDeep<EventRow>;
type AgendaEventInsertState = CamelCasedPropertiesDeep<EventInsert>;

export type AgendaEventState = AgendaEventStateRow & {
  removed?: boolean;
};

export type AgendaState = AgendaStateRow & {
  events: AgendaEventState[];
  removed?: boolean;
};

type AgendaEventFormField =
  | "name"
  | "nameIt"
  | "description"
  | "descriptionIt"
  | "appIcon"
  | "startedAt"
  | "endedAt";

export type AgendaEventFormType = {
  [Field in AgendaEventFormField]-?: NonNullable<AgendaEventInsertState[Field]>;
};

export type AgendaEventInput = AgendaEventFormType & {
  agendaId: NonNullable<AgendaEventInsertState["agendaId"]>;
};

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

export function agendaEventLanguageStatus(event: AgendaEventState) {
  return {
    en: Boolean(event.name.trim() && event.description?.trim()),
    it: Boolean(event.nameIt?.trim() && event.descriptionIt?.trim()),
  };
}

export function hasAgendaLanguageGap(event: AgendaEventState): boolean {
  const status = agendaEventLanguageStatus(event);
  return status.en !== status.it;
}
