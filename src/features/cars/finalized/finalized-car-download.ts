"use client";

import {
  getCarSubmissionClasses,
  getCarSubmissionVehicle,
} from "@/src/features/cars/submission/api/submission.service";
import { downloadSubmissionForm } from "@/src/features/cars/submission/submission-download";
import {
  addCarEntryFormDocuments,
  renderCarEntryForm,
} from "@/src/features/cars/reservation/review/car-entry-form-download";
import { getCarEntryFormReview } from "@/src/features/cars/reservation/review/car-entry-form-review.service";

export async function downloadFinalizedCarForms(
  submissionVehicleId: string,
  classId: string,
) {
  const [submission, classes, carEntryForm] = await Promise.all([
    getCarSubmissionVehicle(submissionVehicleId),
    getCarSubmissionClasses(),
    getCarEntryFormReview(submissionVehicleId),
  ]);

  await downloadSubmissionForm({ ...submission, classId }, classes, {
    archiveLabel: "Forms",
    pdfLabel: "Forms",
    appendPdf: (pdf) => renderCarEntryForm(pdf, carEntryForm),
    appendFiles: (folder) =>
      addCarEntryFormDocuments(folder, carEntryForm),
  });
}
