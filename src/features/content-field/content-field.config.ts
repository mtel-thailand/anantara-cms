import type { ContentFieldPageKey, ContentFieldSurface } from "./content-field.types";

type ContentFieldDefinition = {
  key: string;
  requiredVariants: readonly `${"web" | "app"}:${"en" | "it"}`[];
  surfaces: readonly ContentFieldSurface[];
  variants: readonly `${"web" | "app"}:${"en" | "it"}`[];
};

const heroField = {
  key: "hero",
  requiredVariants: ["web:en", "app:en"],
  surfaces: ["desktop", "app"],
  variants: ["web:en", "web:it", "app:en"],
} as const satisfies ContentFieldDefinition;

export const contentFieldDefinitions = {
  "cars.classes": [heroField],
  judges: [heroField],
  sponsors: [
    {
      key: "header",
      requiredVariants: ["web:en", "app:en"],
      surfaces: ["desktop", "app"],
      variants: ["web:en", "web:it", "app:en"],
    },
    {
      key: "footer",
      requiredVariants: ["web:en"],
      surfaces: ["desktop"],
      variants: ["web:en", "web:it"],
    },
  ],
} as const satisfies Record<ContentFieldPageKey, readonly ContentFieldDefinition[]>;

export function getContentFieldDefinitions(pageKey: ContentFieldPageKey) {
  return contentFieldDefinitions[pageKey] as readonly ContentFieldDefinition[];
}

export function getRequiredContentFieldVariants(pageKey: ContentFieldPageKey) {
  return getContentFieldDefinitions(pageKey).flatMap((field) =>
    field.requiredVariants.map((variant) => ({ fieldKey: field.key, variant })),
  );
}

export function channelForSurface(surface: ContentFieldSurface) {
  return surface === "desktop" ? "web" : "app";
}
