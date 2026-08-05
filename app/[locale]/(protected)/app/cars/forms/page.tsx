import { ReservationFormListClient } from "@/src/features/cars/reservation/list/reservation-list-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Car & reservation forms" };

export default function CarSubmissionsPage() {
  return <ReservationFormListClient />;
}
