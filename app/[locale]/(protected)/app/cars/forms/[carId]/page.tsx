import type { Metadata } from "next";

import { CarFormsReviewClient } from "@/src/features/cars/reservation/review/car-forms-review-client";

export const metadata: Metadata = { title: "Car forms review" };

export default async function CarEntryFormReviewPage({
  params,
}: {
  params: Promise<{ carId: string }>;
}) {
  const { carId } = await params;
  return <CarFormsReviewClient carId={carId} />;
}
