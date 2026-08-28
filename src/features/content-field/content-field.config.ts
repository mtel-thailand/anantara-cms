import type { ContentFieldPageKey, ContentFieldSurface } from "./content-field.types";

type ContentFieldDefinition = {
  key: string;
  surfaces: readonly ContentFieldSurface[];
  variants: readonly `${"web" | "app"}:${"en" | "it"}`[];
};

const heroField = {
  key: "hero",
  surfaces: ["desktop", "app"],
  variants: ["web:en", "web:it", "app:en"],
} as const satisfies ContentFieldDefinition;

export const contentFieldDefinitions = {
  "cars.classes": [heroField],
  judges: [heroField],
  sponsors: [
    {
      key: "header",
      surfaces: ["desktop", "app"],
      variants: ["web:en", "web:it", "app:en"],
    },
    {
      key: "footer",
      surfaces: ["desktop"],
      variants: ["web:en", "web:it"],
    },
  ],
} as const satisfies Record<ContentFieldPageKey, readonly ContentFieldDefinition[]>;

export function getContentFieldDefinitions(pageKey: ContentFieldPageKey) {
  return contentFieldDefinitions[pageKey] as readonly ContentFieldDefinition[];
}

export function channelForSurface(surface: ContentFieldSurface) {
  return surface === "desktop" ? "web" : "app";
}
