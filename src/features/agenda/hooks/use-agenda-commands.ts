import { eventEmitter } from "@/src/lib/events";
import { useEffect, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import type { AgendaCommand } from "@/src/features/agenda/agenda.commands";
import { agendaReducer } from "@/src/features/agenda/agenda.reducer";
import { AgendaState } from "@/src/features/agenda/agenda.types";

function useAgendaCommands(
  setAgendas: Dispatch<SetStateAction<AgendaState[]>>,
) {
  useEffect(() => {
    const handleCommand = (command: AgendaCommand) => {
      setAgendas((current) => agendaReducer(current, command));

      if (command.type === "restore-date") {
        toast.success("Date restored");
      }
    };

    eventEmitter.on("agenda:command", handleCommand);

    return () => {
      eventEmitter.off("agenda:command", handleCommand);
    };
  }, [setAgendas]);
}

export default useAgendaCommands;
