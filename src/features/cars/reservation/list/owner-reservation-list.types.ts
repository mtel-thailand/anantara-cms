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

export type OwnerFormStatus = (typeof OWNER_RESERVATION_STATUSES)[number];

export type OwnerReservationStatus =
  Database["public"]["Enums"]["owner_reservation_status"];

export type OwnerReservationFilter = OwnerReservationStatus | "all";

export type OwnerReservationListSortKey = "deleted" | "status" | "updated";

export type OwnerReservationListFilters = {
  status: OwnerReservationStatus | null;
  hasDeletedAt: boolean;
};

export type OwnerReservationListParams = PaginationRequest<
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
  deletedAt: string | null;
  updatedAt: string;
  hasCarsMovedBackToPreApproval: boolean;
  approvedVehicleCount: number;
  finalizedVehicleCount: number;
};

export type OwnerReservationInformationRequest = {
  id: string;
  message: string;
  sentDate: string;
};

export type OwnerReservationDetail =
  Database["public"]["Tables"]["owner_reservations"]["Row"] & {
    carNames: string[];
    deletedAt: string | null;
    infoRequests: OwnerReservationInformationRequest[];
    ownerPackageName: string;
    roomCategoryName: string;
  };

export type OwnerReservationStatusCounts = Record<
  OwnerReservationStatus | "all",
  number
>;

export type OwnerReservationListData = {
  items: OwnerReservationListItem[];
  statusCounts: OwnerReservationStatusCounts;
};

export type OwnerReservationListResult =
  PaginationResult<OwnerReservationListData>;
