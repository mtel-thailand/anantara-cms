"use client";

import { PageHeader } from "@/src/components/page-header";
import { Badge } from "@/src/components/ui/badge";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import Text from "@/src/components/ui/text";
import { CalendarPlus, Clock, Save, TriangleAlert, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAgendas, saveAgendas } from "./agenda.service";
import { AgendaState, hasAgendaLanguageGap } from "./types";
import useAsync from "@/src/hooks/use-async";
import AgendaTable from "./components/agenda-table";
import AgendaClientSkeleton from "./components/agenda-table-skeleton";
import { useAgendaActionModals } from "./components/agenda-action-modals";
import { useAgendaDateModal } from "./components/agenda-date-modals";
import { toISODate } from "@/src/lib/date";
import { toast } from "sonner";
import useAgendaCommands from "./hooks/use-agenda-commands";
import { sortAgendas } from "./agenda.reducer";

const AGENDA_STORAGE_KEY = "agenda";

export default function AgendaClient() {
  const [agendas, setAgendas] = useState<AgendaState[]>([]);
  const [publishedAgendas, setPublishedAgendas] = useState<AgendaState[]>(
    [],
  );
  const [storageReady, setStorageReady] = useState(false);
  const { isLoading, execute } = useAsync(true);

  const [prioritizeGaps, setPrioritizeGaps] = useState(false);

  useAgendaCommands(setAgendas);

  const usedDates = useMemo(
    () =>
      agendas
        .filter((agenda) => !agenda.removed)
        .map((agenda) => toISODate(agenda.date ?? agenda.createdAt)),
    [agendas],
  );
  const openDateModal = useAgendaDateModal(usedDates);
  const { openDiscardModal, openPublishModal } = useAgendaActionModals();

  const sortedAgendas = useMemo(() => sortAgendas([...agendas]), [agendas]);

  const duplicateDates = useMemo(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const agenda of agendas) {
      if (agenda.removed) continue;
      const date = toISODate(agenda.date ?? agenda.createdAt);
      if (seen.has(date)) duplicates.add(date);
      seen.add(date);
    }

    return duplicates;
  }, [agendas]);

  const incompleteCount = useMemo(
    () =>
      agendas
        .filter((agenda) => !agenda.removed)
        .flatMap((agenda) => agenda.events)
        .filter((event) => !event.removed && hasAgendaLanguageGap(event))
        .length,
    [agendas],
  );

  const agendaDirty = useMemo(
    () => JSON.stringify(agendas) !== JSON.stringify(publishedAgendas),
    [agendas, publishedAgendas],
  );

  useEffect(() => {
    (async () => {
      try {
        const data = await execute(getAgendas);
        const sortedAgenda = sortAgendas([...data]);

        let initialAgendas = sortedAgenda;
        const agendaDraft = window.localStorage.getItem(AGENDA_STORAGE_KEY);

        if (agendaDraft) {
          try {
            const parsedDraft: unknown = JSON.parse(agendaDraft);

            if (Array.isArray(parsedDraft) && parsedDraft.length > 0) {
              initialAgendas = parsedDraft as AgendaState[];
            } else {
              window.localStorage.removeItem(AGENDA_STORAGE_KEY);
            }
          } catch {
            window.localStorage.removeItem(AGENDA_STORAGE_KEY);
          }
        }

        setAgendas(initialAgendas);
        setPublishedAgendas(sortedAgenda);
        setStorageReady(true);
      } catch (error: unknown) {
        console.log("eiei", error);
      }
    })();
  }, [execute]);

  useEffect(() => {
    if (!storageReady) return;

    if (!agendaDirty) {
      window.localStorage.removeItem(AGENDA_STORAGE_KEY);
      return;
    }

    if (agendas.length === 0) return;

    window.localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(agendas));
  }, [agendaDirty, agendas, storageReady]);

  function handleAddDate() {
    openDateModal();
  }

  function handleDiscardChanges() {
    openDiscardModal(() => {
      setAgendas(publishedAgendas);
      setPrioritizeGaps(false);
      toast.success("Changes discarded");
    });
  }

  async function onPublish(): Promise<boolean> {
    // not removed
    // if (incompleteCount > 0 && !prioritizeGaps) {
    //   setPrioritizeGaps(true);
    //   toast.warning(`${incompleteCount} item(s) are missing a translation`, {
    //     description:
    //       "Items needing attention are shown first. Publish again to continue.",
    //   });
    //   return;
    // }
    try {
      const agendasToSave = sortAgendas(agendas).map((agenda, index) => ({
        ...agenda,
        seq: index + 1,
      }));
      const savedAgendas = sortAgendas(await saveAgendas(agendasToSave));

      window.localStorage.removeItem(AGENDA_STORAGE_KEY);
      setAgendas(savedAgendas);
      setPublishedAgendas(savedAgendas);
      setPrioritizeGaps(false);
      toast.success("Agenda published", {
        description: "The schedule is now saved.",
      });
      return true;
    } catch (error: unknown) {
      console.error("Failed to publish agenda", error);
      toast.error("Could not publish agenda", {
        description: "Your local changes are still available. Try again.",
      });
      return false;
    }
  }

  function handlePublish() {
    if (duplicateDates.size > 0) {
      toast.error("Two tables share the same date", {
        description:
          "Change or remove one of the duplicated dates before publishing.",
      });
      return;
    }

    openPublishModal({
      incompleteCount,
      onFixContent: () => setPrioritizeGaps(true),
      onPublish,
    });
  }

  const handleEditAgendaDate = useCallback(
    (agenda: AgendaState) => {
      openDateModal({
        id: agenda.id,
        date: toISODate(agenda.date ?? agenda.createdAt),
      });
    },
    [openDateModal],
  );

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Plan the event schedule. Each date is its own table; agenda items sort automatically by their start time."
        viewport={["desktop", "mobile"]}
        titleAccessory={
          agendaDirty ? (
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/5 text-primary"
            >
              Unpublished changes
            </Badge>
          ) : null
        }
      >
        <Button variant="outline" onClick={handleAddDate}>
          <CalendarPlus className="size-4" /> Add date
        </Button>
        <Button
          variant="outline"
          onClick={handleDiscardChanges}
          disabled={!agendaDirty}
        >
          <Undo2 className="size-4" /> Discard changes
        </Button>
        <Button
          variant="outline"
          onClick={handlePublish}
          disabled={!agendaDirty || isLoading || duplicateDates.size > 0}
        >
          <Save className="size-4" />
          Publish changes
        </Button>
      </PageHeader>
      {prioritizeGaps ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span>Showing items missing a translation first.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPrioritizeGaps(false)}
          >
            Back to time order
          </Button>
        </div>
      ) : null}
      {duplicateDates.size > 0 ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>
            Two tables share the same date. Change or remove one before
            publishing.
          </span>
        </div>
      ) : null}
      {isLoading && <AgendaClientSkeleton />}
      {!isLoading && sortedAgendas.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Clock className="size-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <Text.FormTitle size="lg">No dates yet</Text.FormTitle>
          <Text size="sm" color="muted-foreground" className="max-w-md">
            Add a date to start building the schedule. Each date gets its own
            table of agenda items.
          </Text>
          <Button onClick={handleAddDate}>
            <CalendarPlus className="size-4" /> Add date
          </Button>
        </Card>
      ) : !isLoading ? (
        <div className="flex flex-col gap-7">
          {sortedAgendas.map((agenda) => (
            <AgendaTable
              key={agenda.id}
              agenda={agenda}
              publishedAgenda={publishedAgendas.find(
                (published) => published.id === agenda.id,
              )}
              prioritizeGaps={prioritizeGaps}
              duplicate={
                !agenda.removed &&
                duplicateDates.has(toISODate(agenda.date ?? agenda.createdAt))
              }
              onEditDate={handleEditAgendaDate}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
