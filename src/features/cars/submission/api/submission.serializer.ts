import type { Database, Json } from "@/src/types/database.types";
import type {
  CarSubmission,
  CarSubmissionFormRecord,
  DbSubmissionStatus,
  InformationRequest,
  SubmissionCarRow,
  SubmissionDocument,
  SubmissionFormRow,
  SubmissionImage,
  SubmissionStatus,
  SubmissionVehicleRow,
  SubmissionVehicleWithFormRow,
  SubmissionVehicleWithFormState,
} from "@/src/features/cars/submission/submission.types";

const statusFromDb: Record<DbSubmissionStatus, SubmissionStatus> = {
  pending: "pending",
  under_review: "under_review",
  requested_info: "requested_info",
  info_received: "info_received",
  waitlist: "waitlist",
  approved: "approved",
  rejected: "not_selected",
  finalized: "approved",
  archived: "archived",
};

const statusToDb: Record<SubmissionStatus, DbSubmissionStatus> = {
  pending: "pending",
  under_review: "under_review",
  requested_info: "requested_info",
  info_received: "info_received",
  waitlist: "waitlist",
  not_selected: "rejected",
  approved: "approved",
  archived: "archived",
};

function text(value: string | null | undefined) {
  return value ?? "";
}

function numberFromText(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isInformationRequest(value: Json): value is {
  id: string;
  message: string;
  sentDate: string;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.id === "string" &&
    typeof value.message === "string" &&
    typeof value.sentDate === "string"
  );
}

function infoRequestsFromJson(value: Json | null): InformationRequest[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isInformationRequest);
}

type JsonRecord = { [key: string]: Json | undefined };

type StoredSubmissionImage = {
  seq: number;
  url: string;
  size: number;
  fileName: string;
  publicUrl: string;
  contentType: string;
};

type StoredSubmissionDocument = StoredSubmissionImage & {
  name: string;
};

function objectRecord(value: Json): JsonRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value;
}

function stringField(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function numberField(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : null;
}

function mediaMetadata(record: JsonRecord, publicUrl: string | null) {
  const storedUrl = stringField(record, "url");

  return {
    key: publicUrl ? (storedUrl ?? undefined) : undefined,
    fileName: stringField(record, "fileName") ?? undefined,
    contentType: stringField(record, "contentType") ?? undefined,
    size: numberField(record, "size") ?? undefined,
    seq: numberField(record, "seq") ?? undefined,
  };
}

function imagesFromJson(value: Json): SubmissionImage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        return { id: `image-${index}`, url: item };
      }

      const image = objectRecord(item);
      if (!image) return null;

      const publicUrl = stringField(image, "publicUrl");
      const url = publicUrl ?? stringField(image, "url");
      if (!url) return null;

      return {
        id:
          stringField(image, "url") ??
          `image-${numberField(image, "seq") ?? index}`,
        url,
        ...mediaMetadata(image, publicUrl),
      } satisfies SubmissionImage;
    })
    .filter((item): item is SubmissionImage => Boolean(item));
}

function documentsFromJson(value: Json): SubmissionDocument[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `document-${index}`,
          name: `Document ${index + 1}`,
          url: item,
        };
      }

      const document = objectRecord(item);
      if (!document) return null;

      const publicUrl = stringField(document, "publicUrl");
      const url = publicUrl ?? stringField(document, "url");
      if (!url) return null;

      return {
        id:
          stringField(document, "id") ??
          stringField(document, "url") ??
          `document-${index}`,
        name:
          stringField(document, "name") ??
          stringField(document, "fileName") ??
          `Document ${index + 1}`,
        url,
        ...mediaMetadata(document, publicUrl),
      } satisfies SubmissionDocument;
    })
    .filter((item): item is SubmissionDocument => Boolean(item));
}

function storedImage(image: SubmissionImage, index: number) {
  return {
    seq: index + 1,
    url: image.key ?? image.url,
    size: image.size ?? 0,
    fileName: image.fileName ?? `image-${index + 1}`,
    publicUrl: image.url,
    contentType: image.contentType ?? "",
  } satisfies StoredSubmissionImage;
}

function storedDocument(document: SubmissionDocument, index: number) {
  return {
    name: document.name,
    seq: index + 1,
    url: document.key ?? document.url,
    size: document.size ?? 0,
    fileName: document.fileName ?? document.name,
    publicUrl: document.url,
    contentType: document.contentType ?? "",
  } satisfies StoredSubmissionDocument;
}

function toCarSubmissionFormRecord(
  form: SubmissionFormRow,
): CarSubmissionFormRecord {
  return {
    acceptNews: form.accept_news,
    acceptTerms: form.accept_terms,
    accessToken: form.access_token,
    address: form.address,
    createdAt: form.created_at,
    deletedAt: form.deleted_at,
    email: form.email,
    firstName: form.first_name,
    formId: form.form_id,
    id: form.id,
    name: form.name,
    phoneNumber: form.phone_number,
    syncedAt: form.synced_at,
    zipCode: form.zip_code,
  };
}

export function toCarSubmissionListItem(
  row: SubmissionVehicleWithFormRow,
): SubmissionVehicleWithFormState {
  return {
    additionalPhotoLink: row.additional_photo_link,
    images: row.images,
    vehicleDocuments: row.vehicle_documents,
    seen: !!row.seen,
    archivedAt: row.archived_at,
    bodyStyle: row.body_style,
    chassisNo: row.chassis_no,
    coachbuilder: row.coachbuilder,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    engineNo: row.engine_no,
    exteriorColour: row.exterior_colour,
    id: row.id,
    interiorColour: row.interior_colour,
    internalComment: row.internal_comment,
    makeOfVehicle: row.make_of_vehicle,
    model: row.model,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    sequence: row.sequence,
    status: row.status,
    submissionId: row.submission_id,
    updatedAt: row.updated_at,
    vehicleHistoryEn: row.vehicle_history_en,
    vehicleHistoryIt: row.vehicle_history_it,
    yearOfManufacture: row.year_of_manufacture,
    carSubmissionsForm: toCarSubmissionFormRecord(row.car_submissions_form),
    carId: row.car_id,
  };
}

export function toCarSubmission(
  form: SubmissionFormRow,
  vehicle: SubmissionVehicleRow,
  car?: SubmissionCarRow | null,
): CarSubmission {
  const documents = documentsFromJson(vehicle.vehicle_documents);

  if (vehicle.additional_photo_link) {
    documents.push({
      id: `${vehicle.id}-additional-photo-link`,
      name: "Additional photo link",
      url: vehicle.additional_photo_link,
      additionalPhotoLink: true,
    });
  }

  return {
    id: vehicle.id,
    carId: vehicle.car_id,
    formId: form.id,
    classId: car?.category_id ? String(car.category_id) : "",
    year: numberFromText(vehicle.year_of_manufacture),
    status: statusFromDb[vehicle.status],
    owner: {
      firstName: form.first_name,
      lastName: form.name,
      email: form.email,
      mobile: text(form.phone_number),
      address: text(form.address),
      postcode: text(form.zip_code),
    },
    vehicle: {
      make: vehicle.make_of_vehicle,
      model: vehicle.model,
      bodyStyle: text(vehicle.body_style),
      coachbuilder: text(vehicle.coachbuilder),
      exteriorColour: text(vehicle.exterior_colour),
      chassisNumber: text(vehicle.chassis_no),
      engineNumber: text(vehicle.engine_no),
    },
    history: {
      en: text(vehicle.vehicle_history_en),
      it: text(vehicle.vehicle_history_it),
    },
    documents,
    images: imagesFromJson(vehicle.images),
    submissionDate: vehicle.created_at,
    lastUpdated: vehicle.updated_at,
    seen: Boolean(vehicle.seen),
    internalComments: text(vehicle.internal_comment),
    infoRequests: infoRequestsFromJson(vehicle.review_note),
  };
}

export function submissionFormPayload(
  submission: Pick<CarSubmission, "owner">,
) {
  return {
    address: submission.owner.address || null,
    email: submission.owner.email,
    first_name: submission.owner.firstName,
    name: submission.owner.lastName,
    phone_number: submission.owner.mobile || null,
    zip_code: submission.owner.postcode || null,
  } satisfies Database["public"]["Tables"]["car_submissions_form"]["Update"];
}

export function vehiclePayload(submission: CarSubmission) {
  const images = submission.images.map(storedImage) satisfies Json[];
  const additionalPhotoLink = submission.documents.find(
    (document) => document.additionalPhotoLink,
  );
  const documents = submission.documents
    .filter((document) => !document.additionalPhotoLink)
    .map(storedDocument) satisfies Json[];

  return {
    additional_photo_link: additionalPhotoLink?.url || null,
    body_style: submission.vehicle.bodyStyle || null,
    chassis_no: submission.vehicle.chassisNumber || null,
    coachbuilder: submission.vehicle.coachbuilder || null,
    engine_no: submission.vehicle.engineNumber || null,
    exterior_colour: submission.vehicle.exteriorColour || null,
    internal_comment: submission.internalComments || null,
    images,
    make_of_vehicle: submission.vehicle.make,
    model: submission.vehicle.model,
    review_note: submission.infoRequests as unknown as Json,
    reviewed_at: new Date().toISOString(),
    status: statusToDb[submission.status],
    updated_at: new Date().toISOString(),
    vehicle_documents: documents,
    vehicle_history_en: submission.history.en || null,
    vehicle_history_it: submission.history.it || null,
    year_of_manufacture: String(submission.year),
  } satisfies Database["public"]["Tables"]["car_submission_vehicles"]["Update"];
}
