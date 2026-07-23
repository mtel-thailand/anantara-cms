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

export type AgendaRecordWithEventsRow = AgendaRow & {
  events: EventRow[];
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
