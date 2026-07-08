"use client";

import { Translator } from "@/src/types/translation";
import z from "zod";

function getAgendaSchema(t: Translator) {
  const message = t("main.main");
  const addAgendaItemSchema = z
    .object({
      name: z.string(),
      nameIt: z.string(),
      startedAt: z.string(message).nonempty(),
      endedAt: z.string(),
      appIcon: z.string(message).nonempty(),
      description: z.string(),
      descriptionIt: z.string(),
    })
    .superRefine((value, context) => {
      if (!value.name.trim() && !value.nameIt.trim()) {
        for (const path of ["name", "nameIt"] as const) {
          context.addIssue({ code: "custom", path: [path], message });
        }
      }

      if (!value.description.trim() && !value.descriptionIt.trim()) {
        for (const path of ["description", "descriptionIt"] as const) {
          context.addIssue({ code: "custom", path: [path], message });
        }
      }

      if (
        value.startedAt &&
        value.endedAt &&
        value.endedAt < value.startedAt
      ) {
        context.addIssue({
          code: "custom",
          path: ["endedAt"],
          message: "End time cannot be earlier than start time.",
        });
      }
    });
  return addAgendaItemSchema;
}

export { getAgendaSchema };
