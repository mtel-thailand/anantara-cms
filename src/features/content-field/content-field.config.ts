import type { ContentFieldPageKey, ContentFieldSurface } from "./content-field.types";

type ContentFieldDefinition = {
  contentType: "plain_text" | "rich_text";
  key: string;
  requiredVariants: readonly ContentFieldVariant[];
  surfaces: readonly ContentFieldSurface[];
  variants: readonly ContentFieldVariant[];
};

type ContentFieldVariant =
  | `${"web" | "app"}:${"en" | "it"}`
  | "shared:und";

const heroField = {
  contentType: "rich_text",
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
      contentType: "rich_text",
      key: "header",
      requiredVariants: ["web:en", "app:en"],
      surfaces: ["desktop", "app"],
      variants: ["web:en", "web:it", "app:en"],
    },
    {
      contentType: "rich_text",
      key: "footer",
      requiredVariants: ["web:en"],
      surfaces: ["desktop"],
      variants: ["web:en", "web:it"],
    },
  ],
  "awards.best_in_class": [
    {
      contentType: "plain_text",
      key: "description",
      requiredVariants: ["shared:und"],
      surfaces: [],
      variants: ["shared:und"],
    },
  ],
  "awards.best_of_show": [
    {
      contentType: "plain_text",
      key: "description",
      requiredVariants: ["shared:und"],
      surfaces: [],
      variants: ["shared:und"],
    },
  ],
  "awards.special_awards": [
    {
      contentType: "plain_text",
      key: "description",
      requiredVariants: ["shared:und"],
      surfaces: [],
      variants: ["shared:und"],
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
