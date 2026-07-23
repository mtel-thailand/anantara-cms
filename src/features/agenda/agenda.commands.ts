import type { AgendaEventInput } from "./agenda.types";

export type AgendaCommand =
  | { type: "add-date"; date: string }
  | { type: "edit-date"; id: string; date: string | Date }
  | { type: "remove-date"; id: string }
  | { type: "restore-date"; id: string }
  | {
      type: "add-event";
      eventId: string;
      createdAt: string;
      item: AgendaEventInput;
    }
  | { type: "edit-event"; eventId: string; item: AgendaEventInput }
  | { type: "remove-event"; agendaId: string; eventId: string }
  | { type: "restore-event"; agendaId: string; eventId: string };
