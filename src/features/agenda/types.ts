export type AgendaEventType = {
  id: string;
  created_at: string;
  agenda_id: string;
  name: string;
  name_it: string | undefined | null;
  description: string;
  description_it: string | undefined | null;
  started_at: string;
  ended_at: string | null | undefined;
  app_icon: string;
  removed?: boolean;
};

export type AgendaType = {
  id: string;
  created_at: string;
  name: string;
  date: string;
  events: AgendaEventType[];
  removed?: boolean;
  seq: number;
};

export type AgendaEventFormType = Pick<
  AgendaEventType,
  | "name"
  | "name_it"
  | "description"
  | "description_it"
  | "app_icon"
  | "started_at"
  | "ended_at"
>;

export type AgendaItemFormType = {
  name: string;
  nameIt?: string;
  start: string;
  end?: string;
  icon: string;
  description: string;
  descriptionIt?: string;
};

export type AgendaItemType = AgendaItemFormType & {
  agendaId: string;
};

export function agendaEventToFormValues(
  event: AgendaEventType,
): AgendaItemFormType {
  return {
    name: event.name,
    nameIt: event.name_it ?? "",
    start: event.started_at,
    end: event.ended_at ?? "",
    icon: event.app_icon,
    description: event.description,
    descriptionIt: event.description_it ?? "",
  };
}

export function agendaEventLanguageStatus(event: AgendaEventType) {
  return {
    en: Boolean(event.name.trim() && event.description.trim()),
    it: Boolean(event.name_it?.trim() && event.description_it?.trim()),
  };
}

export function hasAgendaLanguageGap(event: AgendaEventType): boolean {
  const status = agendaEventLanguageStatus(event);
  return status.en !== status.it;
}
