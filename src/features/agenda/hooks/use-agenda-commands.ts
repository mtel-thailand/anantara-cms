import { eventEmitter } from "@/src/lib/events";
import { useEffect } from "react";
import { toast } from "sonner";
import { AgendaCommand } from "../agenda.commands";
import { agendaReducer } from "../agenda.reducer";
import { AgendaType } from "../types";

function useAgendaCommands(
  setAgendas: React.Dispatch<React.SetStateAction<AgendaType[]>>,
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
