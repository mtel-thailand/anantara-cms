import type { SubmissionReviewDraft } from "@/src/features/cars/submission/review/submission-review.types";
import type { SubmissionClass } from "@/src/features/cars/submission/submission.types";
import type { DbSubmissionStatus } from "@/src/features/cars/submission/submission.types";

export type FinalizedCarStatus = "finalized" | "archived";
export type FinalizedCarDraftStatus = FinalizedCarStatus | "rejected";
export type FinalizedCarClassFilter = "all" | "unassigned" | `${number}`;
export type FinalizedCarDraft = SubmissionReviewDraft & {
  stagedStatus: FinalizedCarDraftStatus;
};

export type FinalizedCarListItem = {
  id: string;
  archivedAt: string | null;
  carEntryFormId: string | null;
  categoryId: string;
  className: string;
  classSequence: number | null;
  createdAt: string;
  descriptionEn: string;
  descriptionIt: string;
  hideOwnerName: boolean;
  imageUrl: string;
  make: string;
  model: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerFormNeedsAttention: boolean;
  ownerLastName: string;
  ownerReservationId: string | null;
  status: FinalizedCarStatus;
  updatedAt: string;
  vehicleRef: string;
  year: number;
};

export type FinalizedCarDetailItem = Omit<
  FinalizedCarListItem,
  "status"
> & {
  status: DbSubmissionStatus;
};

export type FinalizedCarsData = {
  classes: SubmissionClass[];
  counts: Record<FinalizedCarStatus, number>;
  items: FinalizedCarListItem[];
  total: number;
};

export type FinalizedCarsSortKey =
  | "name"
  | "year"
  | "owner"
  | "updated";

export type FinalizedCarsPageParams = {
  page: number;
  pageSize: number;
  query: string;
  classFilter: FinalizedCarClassFilter;
  sort: {
    key: FinalizedCarsSortKey;
    descending: boolean;
  };
  status: FinalizedCarStatus;
};
