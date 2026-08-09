import { z } from "zod";

import { CAR_ENTRY_FORM_STATUSES } from "@/src/features/cars/reservation/list/car-entry-form-list.types";

export const CarEntryFormListRpcSchema = z
  .object({
    data: z.array(
      z
        .object({
          submission_vehicle_id: z.string().uuid(),
          car_entry_form_id: z.string().uuid(),
          high_resolution_photos_link: z.string().nullable(),
          can_finalize: z.boolean(),
          image: z.unknown().nullable(),
          owner_forenames: z.string(),
          owner_surname: z.string(),
          owner_reservation_status: z
            .enum(CAR_ENTRY_FORM_STATUSES)
            .nullable(),
          owner_email: z.string(),
          make_of_vehicle: z.string(),
          model: z.string(),
          vehicle_ref: z.string(),
          status: z.enum(CAR_ENTRY_FORM_STATUSES),
          seen: z.boolean(),
          created_at: z.string(),
          updated_at: z.string(),
          deleted_at: z.string().nullable(),
        })
        .strict(),
    ),
    status_counts: z
      .object({
        all: z.number().int().nonnegative(),
        required: z.number().int().nonnegative(),
        requested: z.number().int().nonnegative(),
        received: z.number().int().nonnegative(),
        approved: z.number().int().nonnegative(),
      })
      .strict(),
    total: z.number().int().nonnegative(),
  })
  .strict();

export type CarEntryFormListRpc = z.infer<typeof CarEntryFormListRpcSchema>;
