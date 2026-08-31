import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CarClass,
  CarClassesData,
  ClassAssignableCar,
} from "@/src/features/cars/classes/car-classes.types";
import type { PublishCarClassesInput } from "@/src/features/cars/classes/car-classes.schema";
import type { Database, Json } from "@/src/types/database.types";

type ServerSupabaseClient = SupabaseClient<Database>;

type PersistedCarClass = {
  id: number;
  name: string;
  seq: number | null;
};

function absoluteImageUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_PUBLIC_BASE_URL?.trim() || "";
  return baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/${value.replace(/^\//, "")}`
    : value;
}

function firstImageUrl(images: Json): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;

  const first = images[0];
  if (typeof first === "string") return absoluteImageUrl(first);
  if (!first || typeof first !== "object" || Array.isArray(first)) return null;

  const candidate = first.publicUrl ?? first.url;
  return typeof candidate === "string" ? absoluteImageUrl(candidate) : null;
}

function normalizeLoadedCarClasses(
  classes: PersistedCarClass[],
): CarClass[] {
  const hasConsecutiveSequences = classes.every(
    (carClass, index) => carClass.seq === index + 1,
  );

  return classes.map((carClass, index) => ({
    id: String(carClass.id),
    databaseId: carClass.id,
    name: carClass.name,
    sequence:
      hasConsecutiveSequences && carClass.seq !== null
        ? carClass.seq
        : index + 1,
    removed: false,
  }));
}

function normalizeCarClassSequences(cars: ClassAssignableCar[]) {
  const carsByClass = new Map<string, ClassAssignableCar[]>();

  for (const car of cars) {
    if (!car.categoryId) continue;

    const group = carsByClass.get(car.categoryId) ?? [];
    group.push(car);
    carsByClass.set(car.categoryId, group);
  }

  const sequenceByCarId = new Map<string, number>();
  for (const group of carsByClass.values()) {
    group
      .sort(
        (left, right) =>
          (left.sequence ?? Number.MAX_SAFE_INTEGER) -
            (right.sequence ?? Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name),
      )
      .forEach((car, index) => sequenceByCarId.set(car.id, index + 1));
  }

  return cars.map((car) =>
    car.categoryId
      ? { ...car, sequence: sequenceByCarId.get(car.id) ?? null }
      : { ...car, sequence: null },
  );
}

async function getCarClassesRevision(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase.rpc("car_classes_revision");

  if (error) throw error;
  return data;
}

async function getCarClassesDataSnapshot(
  supabase: ServerSupabaseClient,
): Promise<Omit<CarClassesData, "revision">> {
  const [classResult, vehicleResult, carResult] = await Promise.all([
    supabase
      .from("car_categories")
      .select("id, name, seq")
      .eq("enable", true)
      .order("seq", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true }),
    supabase
      .from("car_submission_vehicles")
      .select("id, archived_at, deleted_at, status, vehicle_ref"),
    supabase
      .from("cars")
      .select(
        "id, category_id, images, name, owner, ref, seq, submission_vehicle_id, year",
      )
      .order("seq", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
  ]);

  if (classResult.error) throw classResult.error;
  if (vehicleResult.error) throw vehicleResult.error;
  if (carResult.error) throw carResult.error;

  const classes = normalizeLoadedCarClasses(classResult.data);
  const vehicleById = new Map(
    vehicleResult.data.map((vehicle) => [vehicle.id, vehicle]),
  );

  let cars = carResult.data.flatMap((car): ClassAssignableCar[] => {
    if (!car.submission_vehicle_id) return [];

    const vehicle = vehicleById.get(car.submission_vehicle_id);
    const assignable =
      vehicle?.status === "finalized" &&
      vehicle.archived_at === null &&
      vehicle.deleted_at === null;

    // A class assignment remains visible even after the submission status changes.
    if (!assignable && car.category_id === null) return [];

    return [
      {
        id: car.id,
        submissionVehicleId: car.submission_vehicle_id,
        categoryId: car.category_id === null ? null : String(car.category_id),
        sequence: car.seq,
        reference: car.ref ?? vehicle?.vehicle_ref ?? "",
        name: car.name,
        owner: car.owner,
        year: car.year,
        imageUrl: firstImageUrl(car.images),
        status: vehicle?.status ?? null,
        assignable,
      },
    ];
  });

  const activeClassIds = new Set(classes.map(({ id }) => id));
  cars = cars.map((car) =>
    !car.categoryId || !activeClassIds.has(car.categoryId)
      ? { ...car, categoryId: null, sequence: null }
      : car,
  );
  cars = normalizeCarClassSequences(cars);

  return { classes, cars };
}

export async function getCarClassesData(
  supabase: ServerSupabaseClient,
): Promise<CarClassesData> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const revisionBefore = await getCarClassesRevision(supabase);
    const snapshot = await getCarClassesDataSnapshot(supabase);
    const revisionAfter = await getCarClassesRevision(supabase);

    if (revisionBefore === revisionAfter) {
      return { ...snapshot, revision: revisionAfter };
    }
  }

  throw new Error(
    "The class configuration changed while loading. Refresh and try again.",
  );
}

export async function publishCarClasses(
  supabase: ServerSupabaseClient,
  input: PublishCarClassesInput,
): Promise<CarClassesData> {
  const { error } = await supabase.rpc("publish_car_classes", {
    p_expected_revision: input.revision,
    p_classes: input.classes,
    p_cars: input.cars,
  });

  if (error) throw error;
  return getCarClassesData(supabase);
}
