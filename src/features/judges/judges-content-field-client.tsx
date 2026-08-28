"use client";

import { ContentFieldClient } from "@/src/features/content-field/content-field-client";
import type { ContentFieldDraft } from "@/src/features/content-field/content-field.types";
import {
  JudgesAppContentPreview,
  JudgesDesktopContentPreview,
} from "./components/judges-content-previews";
import type { JudgesContentPreviewJudge } from "./judges.types";

export function JudgesContentFieldClient({
  description,
  initialDraft,
  initialJudges,
  title,
}: {
  description: string;
  initialDraft: ContentFieldDraft;
  initialJudges: JudgesContentPreviewJudge[];
  title: string;
}) {
  return (
    <ContentFieldClient
      description={description}
      fields={[
        {
          key: "hero",
          label: "Content editor",
          description: "Hero copy shown above the public judges list.",
          surfaces: ["desktop", "app"],
        },
      ]}
      initialDraft={initialDraft}
      previewData={initialJudges}
      previews={{
        app: JudgesAppContentPreview,
        desktop: JudgesDesktopContentPreview,
      }}
      title={title}
      translationNamespace="judges.contentField"
    />
  );
}
