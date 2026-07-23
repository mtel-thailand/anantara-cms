"use client";

import JSZip from "jszip";

import { FormPdf, type PdfImage } from "@/src/lib/form-pdf";
import { formatDate } from "@/src/lib/date";
import {
  romanNumeral,
  SUBMISSION_STATUS_LABELS,
  type CarSubmission,
  type SubmissionClass,
  type SubmissionDocument,
} from "./submission.types";

const LOGO_URL = "/images/logo-black.png";
let logoCache: PdfImage | null | undefined;

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeName(name: string) {
  return name
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function submissionName(submission: CarSubmission) {
  return `${submission.vehicle.make} ${submission.vehicle.model}`.trim();
}

function ownerName(submission: CarSubmission) {
  return `${submission.owner.firstName} ${submission.owner.lastName}`.trim();
}

function submissionBaseName(submission: CarSubmission) {
  return safeName(
    `${submission.vehicleRef} ${submissionName(submission) || "car"} — Basic information`,
  );
}

function fileUrl(url: string, key?: string) {
  return key
    ? `/api/file?${new URLSearchParams({ key, response: "content" })}`
    : url;
}

async function fetchBlob(url: string, key?: string) {
  const response = await fetch(fileUrl(url, key), {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Could not download attachment (${response.status}).`);
  }
  return response.blob();
}

async function loadImage(url: string, key?: string): Promise<PdfImage | null> {
  try {
    const blob = await fetchBlob(url, key);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dimensions = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const image = new Image();
        image.onload = () =>
          resolve({
            height: image.naturalHeight,
            width: image.naturalWidth,
          });
        image.onerror = reject;
        image.src = dataUrl;
      },
    );

    return {
      dataUrl,
      format: blob.type.includes("png") ? "PNG" : "JPEG",
      ...dimensions,
    };
  } catch {
    return null;
  }
}

async function loadLogo() {
  if (logoCache === undefined) {
    logoCache = await loadImage(LOGO_URL);
  }
  return logoCache;
}

function uniqueName(name: string, taken: Set<string>) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  let candidate = name;
  let suffix = 2;

  while (taken.has(candidate.toLowerCase())) {
    candidate = `${base} (${suffix})${extension}`;
    suffix += 1;
  }

  taken.add(candidate.toLowerCase());
  return candidate;
}

async function addSupportingDocuments(
  folder: JSZip,
  documents: SubmissionDocument[],
) {
  const taken = new Set<string>();

  for (const [index, document] of documents.entries()) {
    if (document.additionalPhotoLink) continue;

    const blob = await fetchBlob(document.url, document.key);
    const fallbackName = `Document ${index + 1}`;
    const name = safeName(document.fileName ?? document.name) || fallbackName;
    folder.file(uniqueName(name, taken), blob);
  }
}

function classDisplay(submission: CarSubmission, classes: SubmissionClass[]) {
  const sorted = [...classes].sort((left, right) => left.seq - right.seq);
  const index = sorted.findIndex(
    (submissionClass) => String(submissionClass.id) === submission.classId,
  );
  if (index < 0) return "";

  const label = `Class ${romanNumeral(index + 1)}`;
  return sorted[index].name ? `${label} — ${sorted[index].name}` : label;
}

async function renderBasicInformation(
  pdf: FormPdf,
  submission: CarSubmission,
  classes: SubmissionClass[],
) {
  pdf.formBanner("Basic information");
  const images = (
    await Promise.all(
      submission.images.map((image) => loadImage(image.url, image.key)),
    )
  ).filter((image): image is PdfImage => image !== null);

  if (images.length) {
    pdf.section("Images");
    pdf.imageGrid(images);
    pdf.gap(6);
  }

  pdf.section("Status & class");
  pdf.fields([
    {
      label: "Status",
      value: SUBMISSION_STATUS_LABELS[submission.status],
    },
    { label: "Class", value: classDisplay(submission, classes) },
  ]);
  pdf.gap();

  pdf.section("Personal information");
  pdf.fields([
    { label: "Name", value: submission.owner.lastName },
    { label: "First name(s)", value: submission.owner.firstName },
    { label: "Email", value: submission.owner.email },
    { label: "Mobile / cell no.", value: submission.owner.mobile },
    { label: "Address", value: submission.owner.address },
    { label: "Post / zip code", value: submission.owner.postcode },
  ]);
  pdf.gap();

  pdf.section("Vehicle information");
  pdf.fields([
    { label: "Make of vehicle / marque", value: submission.vehicle.make },
    { label: "Model", value: submission.vehicle.model },
    { label: "Year of manufacture", value: String(submission.year) },
    { label: "Body style", value: submission.vehicle.bodyStyle },
    { label: "Coachbuilder", value: submission.vehicle.coachbuilder },
    {
      label: "Exterior colour(s)",
      value: submission.vehicle.exteriorColour,
    },
    { label: "Chassis no.", value: submission.vehicle.chassisNumber },
    { label: "Engine no.", value: submission.vehicle.engineNumber },
    { label: "Submission date", value: formatDate(submission.submissionDate) },
    { label: "Vehicle reference", value: submission.vehicleRef },
  ]);
  pdf.gap();

  pdf.section("Vehicle history");
  pdf.field("Description (EN)", submission.history.en);
  pdf.field("Description (IT)", submission.history.it);
}

export async function downloadSubmissionForm(
  submission: CarSubmission,
  classes: SubmissionClass[] = [],
) {
  const base = submissionBaseName(submission);
  const pdf = new FormPdf();
  pdf.header(
    submissionName(submission) || "Submission",
    ownerName(submission),
    (await loadLogo()) ?? undefined,
  );
  await renderBasicInformation(pdf, submission, classes);

  const zip = new JSZip();
  const folder = zip.folder(base);
  if (!folder) throw new Error("Could not create the download package.");

  folder.file(`${base}.pdf`, pdf.blob());
  const supportingDocuments = submission.documents.filter(
    (document) => !document.additionalPhotoLink,
  );
  if (supportingDocuments.length) {
    const documentsFolder = folder.folder("Supporting documents");
    if (!documentsFolder) {
      throw new Error("Could not create the supporting documents folder.");
    }
    await addSupportingDocuments(documentsFolder, supportingDocuments);
  }

  const archive = await zip.generateAsync({ type: "blob" });
  triggerDownload(archive, `${base}.zip`);
}
