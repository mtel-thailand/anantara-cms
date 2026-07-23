"use client";

import z from "zod";

function getAgendaSchema() {
  const addAgendaItemSchema = z
    .object({
      name: z.string().trim().min(1, "Enter a title in English."),
      nameIt: z.string(),
      startedAt: z.string().min(1, "Set a start time."),
      endedAt: z.string(),
      appIcon: z.string().min(1, "Select an icon."),
      description: z.string().trim().min(1, "Enter a location in English."),
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
          message:
            "Add the Italian title, or clear Italian from every field.",
        });
      }

      if (hasItalianContent && !value.descriptionIt.trim()) {
        context.addIssue({
          code: "custom",
          path: ["descriptionIt"],
          message:
            "Add the Italian location, or clear Italian from every field.",
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
          message: "End time cannot be earlier than start time.",
        });
      }
    });
  return addAgendaItemSchema;
}

export { getAgendaSchema };
