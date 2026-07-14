import type { Metadata } from "next";
import { SubmissionReviewClient } from "@/src/features/cars/submission/review/submission-review-client";

export const metadata: Metadata = { title: "Review Car Submission" };

export default async function SubmissionReviewPage({
  params,
}: {
  params: Promise<{ carId: string }>;
}) {
  const { carId } = await params;

  return <SubmissionReviewClient carId={carId} />;
}
