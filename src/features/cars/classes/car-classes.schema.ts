import { z } from "zod";

export const carClassNameSchema = z.string().trim().min(1).max(120);

export const carClassFormSchema = z
  .object({ name: carClassNameSchema })
  .strict();

export type CarClassFormValues = z.infer<typeof carClassFormSchema>;

const persistedClassIdSchema = z.string().regex(/^\d+$/);
const temporaryClassIdSchema = z.string().regex(/^temp-[0-9a-f-]+$/i);
const classIdSchema = z.union([
  persistedClassIdSchema,
  temporaryClassIdSchema,
]);

export const publishCarClassesSchema = z
  .object({
    revision: z.string().regex(/^[0-9a-f]{32}$/i),
    classes: z
      .array(
        z
          .object({
            id: classIdSchema,
            name: carClassNameSchema,
            removed: z.boolean(),
            sequence: z.number().int().positive(),
          })
          .strict(),
      )
      .max(100),
    cars: z
      .array(
        z
          .object({
            id: z.string().min(1),
            categoryId: classIdSchema.nullable(),
            sequence: z.number().int().positive().nullable(),
          })
          .strict(),
      )
      .max(5000),
  })
  .strict()
  .superRefine(({ cars, classes }, context) => {
    if (new Set(classes.map(({ id }) => id)).size !== classes.length) {
      context.addIssue({
        code: "custom",
        message: "Class IDs must be unique.",
        path: ["classes"],
      });
    }

    const liveClasses = classes.filter(({ removed }) => !removed);
    const normalizedNames = liveClasses.map(({ name }) =>
      name.trim().toLocaleLowerCase(),
    );
    if (new Set(normalizedNames).size !== normalizedNames.length) {
      context.addIssue({
        code: "custom",
        message: "Class names must be unique.",
        path: ["classes"],
      });
    }

    const liveIds = new Set(liveClasses.map(({ id }) => id));
    if (
      cars.some(
        ({ categoryId }) => categoryId !== null && !liveIds.has(categoryId),
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "A car references a class that is being removed.",
        path: ["cars"],
      });
    }

    if (new Set(cars.map(({ id }) => id)).size !== cars.length) {
      context.addIssue({
        code: "custom",
        message: "Car IDs must be unique.",
        path: ["cars"],
      });
    }

    const orderedSequences = liveClasses
      .map(({ sequence }) => sequence)
      .sort((left, right) => left - right);
    if (orderedSequences.some((sequence, index) => sequence !== index + 1)) {
      context.addIssue({
        code: "custom",
        message: "Live class order must be consecutive.",
        path: ["classes"],
      });
    }

    const sequencesByClass = new Map<string, number[]>();

    for (const car of cars) {
      if (
        (car.categoryId === null && car.sequence !== null) ||
        (car.categoryId !== null && car.sequence === null)
      ) {
        context.addIssue({
          code: "custom",
          message: "Car assignment and order must be provided together.",
          path: ["cars"],
        });
        break;
      }

      if (car.categoryId !== null && car.sequence !== null) {
        const sequences = sequencesByClass.get(car.categoryId) ?? [];
        sequences.push(car.sequence);
        sequencesByClass.set(car.categoryId, sequences);
      }
    }

    for (const [classId, sequences] of sequencesByClass) {
      const ordered = [...sequences].sort((left, right) => left - right);

      if (ordered.some((sequence, index) => sequence !== index + 1)) {
        context.addIssue({
          code: "custom",
          message: "Car order must be consecutive within each class.",
          path: ["cars"],
          params: { classId },
        });
      }
    }
  });

export type PublishCarClassesInput = z.infer<
  typeof publishCarClassesSchema
>;

const carClassesDraftClassSchema = z
  .object({
    id: classIdSchema,
    databaseId: z.number().int().positive().nullable(),
    name: z.string(),
    sequence: z.number().int().positive(),
    removed: z.boolean(),
  })
  .strict();

const carClassesDraftCarSchema = z
  .object({
    id: z.string().min(1),
    submissionVehicleId: z.string().uuid(),
    categoryId: classIdSchema.nullable(),
    sequence: z.number().int().positive().nullable(),
    reference: z.string(),
    name: z.string(),
    owner: z.string(),
    year: z.number().finite(),
    imageUrl: z.string().nullable(),
    status: z
      .enum([
        "pending",
        "under_review",
        "requested_info",
        "waitlist",
        "approved",
        "rejected",
        "finalized",
        "archived",
        "info_received",
      ])
      .nullable(),
    assignable: z.boolean(),
  })
  .strict();

export const carClassesDraftStorageSchema = z
  .object({
    version: z.literal(3),
    data: z
      .object({
        revision: z.string().regex(/^[0-9a-f]{32}$/i),
        classes: z.array(carClassesDraftClassSchema),
        cars: z.array(carClassesDraftCarSchema),
      })
      .strict(),
  })
  .strict();
