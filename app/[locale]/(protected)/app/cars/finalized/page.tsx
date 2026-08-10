import type { Metadata } from "next";

import { FinalizedCarsClient } from "@/src/features/cars/finalized/finalized-cars-client";

export const metadata: Metadata = { title: "Finalized cars" };

export default function FinalizedCarsPage() {
  return <FinalizedCarsClient />;
}
