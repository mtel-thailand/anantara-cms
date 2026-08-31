import type {
  CarClass,
  CarClassesData,
  CarClassRow,
  ClassAssignableCar,
} from "./car-classes.types";
import { carClassesDraftStorageSchema } from "./car-classes.schema";

export const CAR_CLASSES_DRAFT_STORAGE_VERSION = 3;

export function storedCarClassesDraft(value: unknown): CarClassesData | null {
  const parsed = carClassesDraftStorageSchema.safeParse(value);
  return parsed.success ? parsed.data.data : null;
}

export function normalizedCarClassesSnapshot(data: CarClassesData) {
  return JSON.stringify({
    classes: data.classes.map(({ id, name, removed, sequence }) => ({
      id,
      name,
      removed,
      sequence,
    })),
    cars: data.cars.map(({ id, categoryId, sequence }) => ({
      id,
      categoryId,
      sequence,
    })),
  });
}

export function updateCarClassSequences(classes: CarClass[]) {
  let sequence = 0;

  return classes.map((carClass) =>
    carClass.removed
      ? carClass
      : {
          ...carClass,
          sequence: ++sequence,
        },
  );
}

export function getLiveClassPositions(classes: CarClass[]) {
  const positions = new Map<string, number>();
  let position = 0;

  for (const carClass of classes) {
    if (carClass.removed) continue;

    positions.set(carClass.id, ++position);
  }

  return positions;
}

export function groupCarsByClass(cars: ClassAssignableCar[]) {
  const groups = new Map<string, ClassAssignableCar[]>();

  for (const car of cars) {
    if (!car.categoryId) continue;

    const group = groups.get(car.categoryId) ?? [];
    group.push(car);
    groups.set(car.categoryId, group);
  }

  for (const group of groups.values()) {
    group.sort(
      (a, b) =>
        (a.sequence ?? Number.MAX_SAFE_INTEGER) -
        (b.sequence ?? Number.MAX_SAFE_INTEGER),
    );
  }

  return groups;
}

export function createCarClassRows(
  classes: CarClass[],
  carsByClass: Map<string, ClassAssignableCar[]>,
): CarClassRow[] {
  return classes.map((carClass) => ({
    ...carClass,
    carCount: carsByClass.get(carClass.id)?.length ?? 0,
  }));
}

export function stripCarClassRow(row: CarClassRow): CarClass {
  return {
    id: row.id,
    databaseId: row.databaseId,
    name: row.name,
    sequence: row.sequence,
    removed: row.removed,
  };
}
