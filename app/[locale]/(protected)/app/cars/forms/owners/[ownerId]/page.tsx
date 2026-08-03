import type { Metadata } from "next";

import { ReservationFormReviewClient } from "@/src/features/cars/reservation/review/reservation-review-client";

export const metadata: Metadata = { title: "Owner registration" };

export default async function OwnerRegistrationReviewPage({
  params,
}: {
  params: Promise<{ ownerId: string }>;
}) {
  const { ownerId } = await params;
  return <ReservationFormReviewClient ownerId={ownerId} />;
}
