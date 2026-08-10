import { z } from "zod";

import { OWNER_RESERVATION_STATUSES } from "@/src/features/cars/reservation/list/owner-reservation-list.types";

export const OwnerReservationListRpcSchema = z
  .object({
    data: z.array(
      z
        .object({
          id: z.string().uuid(),
          submission_id: z.string().uuid(),
          owner_title: z.string().nullable(),
          owner_forenames: z.string().nullable(),
          owner_surname: z.string().nullable(),
          owner_email: z.string().nullable(),
          status: z.enum(OWNER_RESERVATION_STATUSES),
          seen: z.boolean(),
          created_at: z.string(),
          deleted_at: z.string().nullable(),
          updated_at: z.string(),
          has_cars_moved_back_to_pre_approval: z.boolean(),
          approved_vehicle_count: z.number().int().nonnegative(),
          finalized_vehicle_count: z.number().int().nonnegative(),
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

export type OwnerReservationListRpc = z.infer<
  typeof OwnerReservationListRpcSchema
>;
