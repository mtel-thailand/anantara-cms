"use client";

import type { ComponentType } from "react";

import { ContentFieldClient } from "@/src/features/content-field/content-field-client";
import { CarsContentFieldPreview } from "./components/cars-content-field-preview";
import type {
  ContentFieldDraft,
  ContentFieldPreviewProps,
} from "@/src/features/content-field/content-field.types";
import type { CarClass } from "@/src/features/cars/classes/car-classes.types";

export function CarsContentFieldClient({
  description,
  initialClasses,
  initialDraft,
  title,
}: {
  description: string;
  initialClasses: CarClass[];
  initialDraft: ContentFieldDraft;
  title: string;
}) {
  return (
    <ContentFieldClient
      description={description}
      fields={[
        {
          contentType: "rich_text",
          key: "hero",
          label: "Content editor",
          description: "Hero copy shown above the public car classes.",
          surfaces: ["desktop", "app"],
        },
      ]}
      initialDraft={initialDraft}
      previewData={initialClasses}
      previews={{
        app: CarsContentFieldPreview as ComponentType<
          ContentFieldPreviewProps<CarClass[]>
        >,
        desktop: CarsContentFieldPreview as ComponentType<
          ContentFieldPreviewProps<CarClass[]>
        >,
      }}
      title={title}
      translationNamespace="cars.contentField"
    />
  );
}
