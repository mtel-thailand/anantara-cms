import { AgendaEventState } from "@/src/features/agenda/agenda.types";

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
