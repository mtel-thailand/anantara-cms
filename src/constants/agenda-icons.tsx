export const AGENDA_ICONS = [
  "car",
  "champagne",
  "food",
  "hospitality",
] as const;
export type AgendaIcon = (typeof AGENDA_ICONS)[number];

export const AGENDA_ICON_FILES: Record<AgendaIcon, string> = {
  car: "/images/agenda-icons/car.svg",
  champagne: "/images/agenda-icons/champagne.svg",
  food: "/images/agenda-icons/food.svg",
  hospitality: "/images/agenda-icons/hospitality.svg",
};

export const AGENDA_ICON_LABELS: Record<AgendaIcon, string> = {
  car: "Car",
  champagne: "Champagne",
  food: "Food",
  hospitality: "Hospitality",
};
