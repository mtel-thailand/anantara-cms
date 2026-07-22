"use client";

import ControlledTextarea from "@/src/components/form/textarea";
import { Card } from "@/src/components/ui/card";
import { SubmissionReviewFormValues } from "@/src/features/cars/submission/review/submission-review.schema";
import type { Control } from "react-hook-form";

export function InternalCommentsCard({
  control,
  isArchived,
}: {
  control: Control<SubmissionReviewFormValues>;
  isArchived: boolean;
}) {
  return (
    <Card className="flex flex-col gap-2.5 p-5 shadow-none">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold">Internal comments</h2>
        <p className="text-xs text-muted-foreground">
          Private notes for the review team. Never shown publicly.
        </p>
      </div>
      <ControlledTextarea<SubmissionReviewFormValues>
        control={control}
        name="internalComments"
        rows={4}
        disabled={isArchived}
        placeholder="Add a note for the team..."
      />
    </Card>
  );
}
