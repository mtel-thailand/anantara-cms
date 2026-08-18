"use client";

import JSZip from "jszip";

import type { CarEntryFormReviewDetail } from "@/src/features/cars/reservation/review/car-entry-form-review.types";
import {
  carEntryFormDocuments,
  carEntryFormDocumentUrl,
  type CarEntryFormDocument,
} from "@/src/features/cars/reservation/review/car-entry-form-documents";
import { FormPdf, type PdfImage } from "@/src/lib/form-pdf";

export type CarEntryFormDownloadMeta = {
  make: string;
  model: string;
  ownerName?: string;
  vehicleRef: string;
};

export type CarEntryFormDownloadOptions = {
  archiveLabel?: string;
  supportingDocuments?: CarEntryFormDocument[];
};

const LOGO_URL = "/images/logo-black.png";
let logoCache: PdfImage | null | undefined;

function safeName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

async function fetchBlob(document: CarEntryFormDocument) {
  const response = await fetch(carEntryFormDocumentUrl(document), {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Could not download attachment (${response.status}).`);
  }
  return response.blob();
}

async function addDocumentsToFolder(
  parent: JSZip,
  folderName: string,
  documents: CarEntryFormDocument[],
) {
  if (!documents.length) return;

  const target = parent.folder(folderName);
  if (!target) throw new Error(`Could not create the ${folderName} folder.`);

  const names = new Set<string>();
  const files = await Promise.all(
    documents.map(async (document, index) => {
      const fallback = `Document ${index + 1}`;
      let name = safeName(document.name) || fallback;
      if (names.has(name.toLowerCase())) name = `${index + 1}-${name}`;
      names.add(name.toLowerCase());
      return { blob: await fetchBlob(document), name };
    }),
  );

  files.forEach(({ blob, name }) => target.file(name, blob));
}

async function loadImage(url: string): Promise<PdfImage | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dimensions = await new Promise<{ height: number; width: number }>(
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
  if (logoCache === undefined) logoCache = await loadImage(LOGO_URL);
  return logoCache;
}

function renderForm(pdf: FormPdf, detail: CarEntryFormReviewDetail) {
  const { form, technicians, vehicle } = detail;
  const value = (input: string | number | null | undefined) =>
    input === null || input === undefined ? "" : String(input);

  pdf.formBanner("Car entry form & certificate");
  pdf.section("Owner information");
  pdf.field(
    "Name of owner(s) / collection name",
    value(form.owner_collection_name),
  );
  pdf.bool(
    "Do not show the owner’s name — use “Collezione Privata” instead",
    form.hide_owner_name,
  );
  pdf.gap();

  pdf.section("Vehicle information");
  pdf.fields([
    { label: "Make of vehicle / marque", value: value(vehicle.make_of_vehicle) },
    { label: "Model", value: value(vehicle.model) },
    { label: "Body type", value: value(vehicle.body_style) },
    { label: "Coachbuilder", value: value(vehicle.coachbuilder) },
    { label: "Year of manufacture", value: value(vehicle.year_of_manufacture) },
    { label: "Exterior colour(s)", value: value(vehicle.exterior_colour) },
    { label: "Interior colour(s)", value: value(vehicle.interior_colour) },
    {
      label: "Registration / plate number",
      value: value(form.registration_plate_number),
    },
  ]);
  pdf.gap();

  pdf.section("Technical details");
  pdf.fields([
    { label: "Chassis no.", value: value(vehicle.chassis_no) },
    { label: "Engine serial no.", value: value(vehicle.engine_no) },
    { label: "Engine make", value: value(form.engine_make) },
    { label: "Engine capacity", value: value(form.engine_capacity) },
    { label: "Engine configuration", value: value(form.engine_configuration) },
    { label: "Number of cylinders", value: value(form.number_of_cylinders) },
  ]);
  pdf.bool("The coachwork is original", Boolean(form.is_coachwork_original));
  pdf.bool("The engine is original", Boolean(form.is_engine_original));
  pdf.gap();

  pdf.section("Dimensions");
  pdf.fields([
    { label: "Length (mm)", value: value(form.length_mm) },
    { label: "Height (mm)", value: value(form.height_mm) },
    { label: "Width (mm)", value: value(form.width_mm) },
  ]);
  pdf.caption("Used to create a special rain-proof cover.");
  pdf.gap();

  pdf.section("Vehicle history");
  pdf.field("Brief history", value(vehicle.vehicle_history_en));
  pdf.gap();

  pdf.section("Images");
  pdf.field(
    "Higher-resolution photos link",
    value(form.high_resolution_photos_link),
  );
  pdf.gap();

  pdf.section("Vehicle registration certificate");
  const certificateDocuments = carEntryFormDocuments(
    form.registration_certificate_documents,
  );
  certificateDocuments.forEach((document) => {
    pdf.caption(
      `Provided: ${document.name} — included in the “Vehicle registration certificate” folder.`,
    );
  });
  pdf.bool(
    "Owner is unable to provide the vehicle registration certificate at this time",
    form.unable_to_provide_registration_certificate,
  );
  pdf.caption(
    "Owner acknowledges that any traffic fines incurred may remain their responsibility.",
  );
  pdf.gap();

  pdf.section("Vehicle status");
  pdf.bool("Enter the vehicle for judging", Boolean(form.enter_for_judging));
  pdf.bool(
    "The car is licensed to be driven on a public highway",
    Boolean(form.is_licensed_for_public_highway),
  );
  pdf.bool(
    "The car is a non runner — needs to be transported",
    Boolean(form.is_non_runner),
  );
  pdf.field(
    "The owner is bringing this 2nd car to Rome in order to drive it in the Giro d’Anantara tour on Friday 2nd:",
    value(form.second_car_details),
  );
  pdf.gap();

  pdf.section("Detailing");
  pdf.bool(
    "Please do not clean my car",
    form.detailing_preference === "no_cleaning",
  );
  pdf.bool(
    "My vehicle only requires to be dried and lightly dusted as required",
    form.detailing_preference === "dried_and_lightly_dusted",
  );
  pdf.field("Any specific requirements", value(form.special_requirements));
  pdf.gap();

  pdf.section("Transport details");
  pdf.bool(
    "We shall be driving the vehicle to Piazza della Repubblica",
    form.transport_method === "drive_to_piazza",
  );
  pdf.bool(
    "We shall be trailering the vehicle ourselves",
    form.transport_method === "self_transport",
  );
  pdf.field(
    "Own trailer / truck registration",
    value(form.trailer_registration_number),
  );
  pdf.bool(
    "The vehicle will be delivered by a transport company",
    form.transport_method === "transport_company",
  );
  pdf.fields(
    [
      { label: "Company name", value: value(form.transport_company_name) },
      { label: "Contact name", value: value(form.transport_contact_name) },
      {
        label: "Mobile / cell no.",
        value: value(form.transport_contact_phone),
      },
      { label: "Email", value: value(form.transport_contact_email) },
    ],
    2,
  );
  pdf.gap();

  pdf.section("Technician / handler / mechanic");
  pdf.bool(
    "A dedicated technician / handler / mechanic is attending with the car",
    form.has_dedicated_personnel,
  );
  technicians.forEach((technician, index) => {
    pdf.caption(`${index + 1}° Technician / handler / mechanic`);
    pdf.fields([
      { label: "Forename", value: technician.forename },
      { label: "Surname", value: technician.surname },
      { label: "Address", value: value(technician.address) },
      { label: "Post / ZIP code", value: value(technician.zip_code) },
      { label: "Country", value: value(technician.country) },
      { label: "Mobile / cell no.", value: value(technician.phone_number) },
      { label: "Email", value: value(technician.email) },
    ]);
  });
  pdf.field(
    "Extra technician / handler / mechanic tickets needed",
    value(form.extra_tickets_needed),
  );
}

export async function downloadCarEntryForm(
  detail: CarEntryFormReviewDetail,
  meta: CarEntryFormDownloadMeta,
  options: CarEntryFormDownloadOptions = {},
) {
  const vehicleName = [meta.make, meta.model].filter(Boolean).join(" ") || "Car";
  const base = safeName(
    `${meta.vehicleRef} ${vehicleName} — ${options.archiveLabel ?? "Car entry form"}`,
  );
  const pdf = new FormPdf();
  pdf.header(
    vehicleName,
    meta.ownerName || detail.form.owner_collection_name || "",
    (await loadLogo()) ?? undefined,
  );
  renderForm(pdf, detail);

  const zip = new JSZip();
  const folder = zip.folder(base);
  if (!folder) throw new Error("Could not create the download package.");
  folder.file(`${base}.pdf`, pdf.blob());

  const certificateDocuments = carEntryFormDocuments(
    detail.form.registration_certificate_documents,
  );
  await Promise.all([
    addDocumentsToFolder(
      folder,
      "Supporting documents",
      options.supportingDocuments ?? [],
    ),
    addDocumentsToFolder(
      folder,
      "Vehicle registration certificate",
      certificateDocuments,
    ),
  ]);

  triggerDownload(await zip.generateAsync({ type: "blob" }), `${base}.zip`);
}
