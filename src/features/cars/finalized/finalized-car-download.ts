"use client";

import {
  downloadCarEntryForm,
  type CarEntryFormDownloadMeta,
} from "@/src/features/cars/reservation/review/car-entry-form-download";
import { getCarEntryFormReview } from "@/src/features/cars/reservation/review/car-entry-form-review.service";
import { getFinalizedCarSupportingDocuments } from "@/src/features/cars/finalized/finalized-cars.service";

export async function downloadFinalizedCarForms(
  submissionVehicleId: string,
  meta: CarEntryFormDownloadMeta,
) {
  const [detail, supportingDocuments] = await Promise.all([
    getCarEntryFormReview(submissionVehicleId),
    getFinalizedCarSupportingDocuments(submissionVehicleId),
  ]);

  await downloadCarEntryForm(detail, meta, {
    archiveLabel: "Forms",
    supportingDocuments,
  });
}
