export type CarClass = {
  id: string;
  databaseId: number | null;
  name: string;
  sequence: number;
  removed: boolean;
};

export type ClassAssignableCar = {
  id: string;
  submissionVehicleId: string;
  categoryId: string | null;
  sequence: number | null;
  reference: string;
  name: string;
  owner: string;
  year: number;
  imageUrl: string | null;
  status: DbSubmissionStatus | null;
  /** Only active finalized cars may be newly assigned to a class. */
  assignable: boolean;
};

export type CarClassesData = {
  revision: string;
  classes: CarClass[];
  cars: ClassAssignableCar[];
};

export type CarClassRow = CarClass & {
  carCount: number;
};
import type { DbSubmissionStatus } from "@/src/features/cars/submission/submission.types";
