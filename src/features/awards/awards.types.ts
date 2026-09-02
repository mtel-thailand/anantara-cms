import type { ContentFieldDraft } from "@/src/features/content-field/content-field.types";

export type AwardCar = {
  id: string;
  categoryId: number | null;
  imageUrl: string | null;
  name: string;
  owner: string;
  reference: string;
  submissionVehicleId: string | null;
  year: number;
};

export type AwardClass = {
  id: number;
  name: string;
  sequence: number;
};

export type BestInClassRole = "winner" | "runnerUp";

export type BestInClassEntry = {
  id: string | null;
  carId: string | null;
  categoryId: number;
  role: BestInClassRole;
};

export type BestOfShowEntry = {
  id: string | null;
  carId: string | null;
};

export type SpecialAwardItem = {
  id: string;
  persisted: boolean;
  kind: "car" | "figure";
  title: string;
  titleIt: string;
  carId: string | null;
  personName: string;
  description: string;
  descriptionIt: string;
  imageUrl: string | null;
  sequence: number;
  removed: boolean;
};

export type AwardsCatalog = {
  cars: AwardCar[];
  classes: AwardClass[];
};

export type BestInClassData = AwardsCatalog & {
  entries: BestInClassEntry[];
};

export type BestOfShowData = AwardsCatalog & {
  entry: BestOfShowEntry;
};

export type SpecialAwardsData = AwardsCatalog & {
  items: SpecialAwardItem[];
};

export type AwardPageInitialData<T> = {
  awards: T;
  content: ContentFieldDraft;
};
