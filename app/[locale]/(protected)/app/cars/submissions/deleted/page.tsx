import type { Metadata } from "next";
import { SubmissionsClient } from "@/src/features/cars/submission/list/submission-list-client";

export const metadata: Metadata = { title: "Deleted car Submissions" };

export default function DeletedCarSubmissionsPage() {
  return <SubmissionsClient type='deleted' />;
}
