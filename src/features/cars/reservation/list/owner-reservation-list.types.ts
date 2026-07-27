import type { Database } from "@/src/types/database.types";
import type {
  PaginationRequest,
  PaginationResult,
} from "@/src/hooks/use-pagination-state";

export const OWNER_RESERVATION_STATUSES = [
  "required",
  "requested",
  "received",
  "approved",
] as const satisfies readonly Database["public"]["Enums"]["owner_reservation_status"][];

export type OwnerReservationStatus =
  Database["public"]["Enums"]["owner_reservation_status"];

export type OwnerReservationListSortKey = "status" | "updated";

export type OwnerReservationListFilters = {
  status: OwnerReservationStatus | null;
  hasDeletedAt: boolean;
};

export type OwnerReservationListParams =
  PaginationRequest<
    OwnerReservationListSortKey,
    OwnerReservationListFilters
  >;

export type OwnerReservationListItem = {
  id: string;
  submissionId: string;
  ownerTitle: string;
  ownerForenames: string;
  ownerSurname: string;
  ownerEmail: string;
  status: OwnerReservationStatus;
  seen: boolean;
  createdAt: string;
  updatedAt: string;
  approvedVehicleCount: number;
  finalizedVehicleCount: number;
};

export type OwnerReservationListResult =
  PaginationResult<OwnerReservationListItem[]>;
