import type { Metadata } from "next";
import { SubmissionsClient } from "@/src/features/cars/submission/list/submissions-client";

export const metadata: Metadata = { title: "Car Submissions" };

export default function CarSubmissionsPage() {
  return <SubmissionsClient />;
}
