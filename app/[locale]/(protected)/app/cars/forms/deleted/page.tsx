import { ReservationFormListClient } from "@/src/features/cars/reservation/list/reservation-list-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Car & reservation forms" };

export default async function CarSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return (
    <ReservationFormListClient
      initialTab={tab === "car" ? "car" : "owner"}
      type="deleted"
    />
  );
}
