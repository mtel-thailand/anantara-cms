import type { Database } from "@/src/types/database.types";
import type {
  PaginationRequest,
  PaginationResult,
} from "@/src/hooks/use-pagination-state";
import type { OwnerReservationInformationRequest } from "@/src/features/cars/reservation/list/owner-reservation-list.types";
import type { OwnerFormStatus } from "@/src/features/cars/reservation/list/owner-reservation-list.types";

export const CAR_ENTRY_FORM_STATUSES = [
  "required",
  "requested",
  "received",
  "approved",
] as const satisfies readonly Database["public"]["Enums"]["car_entry_form_status"][];

export type CarEntryFormStatus = (typeof CAR_ENTRY_FORM_STATUSES)[number];
export type CarEntryFormFilter = CarEntryFormStatus | "all";
export type CarEntryFormListSortKey = "status" | "updated";
export type CarEntryFormListFilters = {
  status: CarEntryFormStatus | null;
  hasDeletedAt: boolean;
};
export type CarEntryFormListParams = PaginationRequest<
  CarEntryFormListSortKey,
  CarEntryFormListFilters
>;

export type CarEntryFormListItem = {
  id: string;
  carEntryFormId: string;
  highResolutionPhotosLink: string | null;
  canFinalize: boolean;
  createdAt: string;
  deletedAt: string | null;
  imageUrl: string;
  make: string;
  model: string;
  ownerEmail: string;
  ownerForenames: string;
  ownerSurname: string;
  ownerReservationStatus: OwnerFormStatus | null;
  seen: boolean;
  status: CarEntryFormStatus;
  submissionVehicleId: string;
  updatedAt: string;
  vehicleRef: string;
};

export type CarEntryFormStatusCounts = Record<
  CarEntryFormStatus | "all",
  number
>;
export type CarEntryFormListData = {
  items: CarEntryFormListItem[];
  statusCounts: CarEntryFormStatusCounts;
};
export type CarEntryFormListResult = PaginationResult<CarEntryFormListData>;

export type CarEntryFormRequestDetail = {
  id: string;
  infoRequests: OwnerReservationInformationRequest[];
  submissionVehicleId: string;
};
