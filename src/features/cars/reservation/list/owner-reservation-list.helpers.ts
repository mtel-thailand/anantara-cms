import type { Json } from "@/src/types/database.types";
import type { OwnerReservationInformationRequest } from "@/src/features/cars/reservation/list/owner-reservation-list.types";

function isInformationRequest(
  value: Json,
): value is OwnerReservationInformationRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.id === "string" &&
    typeof value.message === "string" &&
    typeof value.sentDate === "string"
  );
}

export function ownerReservationInformationRequests(
  value: Json,
): OwnerReservationInformationRequest[] {
  return Array.isArray(value) ? value.filter(isInformationRequest) : [];
}
