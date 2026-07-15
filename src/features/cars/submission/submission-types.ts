import { CamelCasedPropertiesDeep } from "@/src/types/common";
import { Database, Json } from "@/src/types/database.types";

export type DbSubmissionStatus =
  Database["public"]["Enums"]["submission_status"];

export const SUBMISSION_STATUSES = [
  "pending",
  "under_review",
  "requested_info",
  "info_received",
  "waitlist",
  "not_selected",
  "approved",
  "archived",
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const REVIEW_STATUSES: SubmissionStatus[] = [
  "pending",
  "under_review",
  "requested_info",
  "waitlist",
  "not_selected",
  "approved",
  // "archived",
];

export type SubmissionStatusKey = DbSubmissionStatus | SubmissionStatus;

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatusKey, string> = {
  pending: "Pending",
  under_review: "Under review",
  requested_info: "Request info",
  info_received: "Info received",
  waitlist: "Waitlist",
  not_selected: "Not selected",
  rejected: "Not selected",
  approved: "Approved",
  archived: "Archived",
  finalized: "Finalized",
};

export const SUBMISSION_STATUS_CLASSES: Record<SubmissionStatusKey, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  under_review: "border-sky-200 bg-sky-50 text-sky-700",
  requested_info: "border-violet-200 bg-violet-50 text-violet-700",
  info_received: "border-teal-200 bg-teal-50 text-teal-700",
  waitlist: "border-zinc-200 bg-zinc-100 text-zinc-600",
  not_selected: "border-rose-200 bg-rose-50 text-rose-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  archived: "border-gray-200 bg-gray-50 text-gray-700",
  finalized: "border-green-200 bg-green-50 text-green-700",
};

export type LocalizedText = { en: string; it: string };

export type SubmissionImage = {
  /** UI-only identity. It is deliberately omitted from the JSONB payload. */
  id: string;
  url: string;
  key?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  seq?: number;
};

export type SubmissionDocument = {
  id: string;
  name: string;
  url: string;
  key?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  seq?: number;
  additionalPhotoLink?: boolean;
};

export type SubmissionOwner = {
  lastName: string;
  firstName: string;
  email: string;
  mobile: string;
  address: string;
  postcode: string;
};

export type SubmissionVehicle = {
  make: string;
  model: string;
  bodyStyle: string;
  coachbuilder: string;
  exteriorColour: string;
  chassisNumber: string;
  engineNumber: string;
};

export type InformationRequest = {
  id: string;
  message: string;
  sentDate: string;
};

export type CarSubmission = {
  id: string;
  formId: string;
  classId: string;
  year: number;
  status: SubmissionStatus;
  owner: SubmissionOwner;
  vehicle: SubmissionVehicle;
  history: LocalizedText;
  documents: SubmissionDocument[];
  images: SubmissionImage[];
  submissionDate: string;
  lastUpdated: string;
  seen: boolean;
  internalComments: string;
  infoRequests: InformationRequest[];
};

export function romanNumeral(value: number) {
  const numerals: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remaining = value;
  let result = "";

  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }

  return result;
}

export type SubmissionVehicleImage = {
  seq: number;
  url: string;
  size: number;
  fileName: string;
  publicUrl: string;
  contentType: string;
};

export function isSubmissionVehicleImage(
  value: unknown,
): value is SubmissionVehicleImage {
  if (typeof value !== "object" || value === null) return false;

  const image = value as Record<string, unknown>;

  return (
    typeof image.seq === "number" &&
    typeof image.url === "string" &&
    typeof image.size === "number" &&
    typeof image.fileName === "string" &&
    typeof image.publicUrl === "string" &&
    typeof image.contentType === "string"
  );
}

export type SubmissionFormRow =
  Database["public"]["Tables"]["car_submissions_form"]["Row"];
export type SubmissionVehicleRow =
  Database["public"]["Tables"]["car_submission_vehicles"]["Row"];


export type SubmissionCarRow = Pick<
  Database["public"]["Tables"]["cars"]["Row"],
  "category_id"
>;

export type SubmissionVehicleWithFormRow = SubmissionVehicleRow & {
  car_submissions_form: SubmissionFormRow;
};

export type SubmissionVehicleWithFormState =
  CamelCasedPropertiesDeep<SubmissionVehicleWithFormRow>;

export type CarSubmissionFormRecord = {
  acceptNews: boolean | null;
  acceptTerms: boolean;
  accessToken: string | null;
  additionalPhotoLink: string | null;
  address: string | null;
  createdAt: string | null;
  email: string;
  firstName: string;
  formId: string;
  id: string;
  name: string;
  phoneNumber: string | null;
  syncedAt: string | null;
  zipCode: string | null;
};

export type CarSubmissionListItem = {
  archivedAt: string | null;
  bodyStyle: string | null;
  chassisNo: string | null;
  coachbuilder: string | null;
  createdAt: string;
  engineNo: string | null;
  exteriorColour: string | null;
  id: string;
  interiorColour: string | null;
  internalComment: Json | null;
  makeOfVehicle: string;
  model: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  sequence: number;
  status: SubmissionStatus;
  submissionId: string;
  updatedAt: string;
  vehicleHistoryEn: string | null;
  vehicleHistoryIt: string | null;
  yearOfManufacture: string;
  carSubmissionsForm: CarSubmissionFormRecord;
};

export function submissionReference(submission: Pick<CarSubmission, "id">) {
  const digits = submission.id.replace(/\D/g, "") || "000";
  return `AC-2026-${digits.padStart(3, "0")}`;
}

export function submissionOwnerName(submission: Pick<CarSubmission, "owner">) {
  return `${submission.owner.firstName} ${submission.owner.lastName}`;
}

export function submissionVehicleName(
  submission: Pick<CarSubmission, "vehicle">,
) {
  return `${submission.vehicle.make} ${submission.vehicle.model}`;
}

export function isNewSubmission(
  submission: Pick<CarSubmission, "seen" | "status">,
) {
  return (
    !submission.seen &&
    (submission.status === "pending" || submission.status === "info_received")
  );
}
