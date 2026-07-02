import type { Metadata } from "next";
import AgendaClient from "@/src/features/agenda/agenda-client";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage() {
  return <AgendaClient />;
}
