"use client";

import z from "zod";
import type { Translator } from "@/src/types/translation";

function getAgendaSchema(t: Translator) {
  const addAgendaItemSchema = z
    .object({
      name: z.string().trim().min(1, t("englishTitle")),
      nameIt: z.string(),
      startedAt: z.string().min(1, t("startTime")),
      endedAt: z.string(),
      appIcon: z.string().min(1, t("icon")),
      description: z.string().trim().min(1, t("englishLocation")),
      descriptionIt: z.string(),
    })
    .superRefine((value, context) => {
      const hasItalianContent = Boolean(
        value.nameIt.trim() || value.descriptionIt.trim(),
      );

      if (hasItalianContent && !value.nameIt.trim()) {
        context.addIssue({
          code: "custom",
          path: ["nameIt"],
          message: t("italianTitle"),
        });
      }

      if (hasItalianContent && !value.descriptionIt.trim()) {
        context.addIssue({
          code: "custom",
          path: ["descriptionIt"],
          message: t("italianLocation"),
        });
      }

      if (
        value.startedAt &&
        value.endedAt &&
        value.endedAt < value.startedAt
      ) {
        context.addIssue({
          code: "custom",
          path: ["endedAt"],
          message: t("endBeforeStart"),
        });
      }
    });
  return addAgendaItemSchema;
}

export { getAgendaSchema };
