"use client";

import { Translator } from "@/src/types/translation";
import z from "zod";

function getAgendaSchema(t: Translator) {
  const message = t("main.main");
  const addAgendaItemSchema = z
    .object({
      name: z.string(),
      nameIt: z.string().optional(),
      start: z.string(message).nonempty(),
      end: z.string().optional(),
      icon: z.string(message).nonempty(),
      description: z.string(),
      descriptionIt: z.string().optional(),
    })
    .superRefine((value, context) => {
      if (!value.name.trim() && !value.nameIt?.trim()) {
        for (const path of ["name", "nameIt"] as const) {
          context.addIssue({ code: "custom", path: [path], message });
        }
      }

      if (!value.description.trim() && !value.descriptionIt?.trim()) {
        for (const path of ["description", "descriptionIt"] as const) {
          context.addIssue({ code: "custom", path: [path], message });
        }
      }

      if (value.start && value.end && value.end < value.start) {
        context.addIssue({
          code: "custom",
          path: ["end"],
          message: "End time cannot be earlier than start time.",
        });
      }
    });
  return addAgendaItemSchema;
}

export { getAgendaSchema };
