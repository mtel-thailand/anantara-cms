import type { Json } from "@/src/types/database.types";
import type { CarEntryFormRequestAction } from "@/src/lib/ses/email";

export type CarEntryFormEmailVehicle = {
  bodyStyle: string;
  imageUrl: string;
  name: string;
  reference: string;
  year: string;
};

export type CarEntryFormEmailContext = {
  accessToken: string;
  recipientEmail: string;
  vehicle: CarEntryFormEmailVehicle;
};

export type CarEntryFormRequestEmailContext = CarEntryFormEmailContext & {
  action: CarEntryFormRequestAction;
};

function publicImageUrl(images: Json) {
  if (!Array.isArray(images)) return "";
  const first = images[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return "";

  const stored = first as Record<string, Json | undefined>;
  const value =
    typeof stored.publicUrl === "string"
      ? stored.publicUrl
      : typeof stored.url === "string"
        ? stored.url
        : "";
  if (!value || /^https?:\/\//i.test(value)) return value;

  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_PUBLIC_BASE_URL?.trim() || "";
  return baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/${value.replace(/^\//, "")}`
    : value;
}

export function carEntryFormEmailVehicle(vehicle: {
  body_style: string | null;
  images: Json;
  make_of_vehicle: string;
  model: string;
  vehicle_ref: string;
  year_of_manufacture: string | null;
}): CarEntryFormEmailVehicle {
  return {
    bodyStyle: vehicle.body_style ?? "",
    imageUrl: publicImageUrl(vehicle.images),
    name: [vehicle.make_of_vehicle, vehicle.model].filter(Boolean).join(" "),
    reference: vehicle.vehicle_ref,
    year: vehicle.year_of_manufacture ?? "",
  };
}
