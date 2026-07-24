"use client";

import ControlledTextarea from "@/src/components/form/textarea";
import { Card } from "@/src/components/ui/card";
import { SubmissionReviewFormValues } from "@/src/features/cars/submission/review/submission-review.schema";
import type { Control } from "react-hook-form";
import { useTranslations } from "next-intl";

export function InternalCommentsCard({
  control,
  disabled,
}: {
  control: Control<SubmissionReviewFormValues>;
  disabled: boolean;
}) {
  const t = useTranslations("cars.submission.review");
  return (
    <Card className="flex flex-col gap-2.5 p-5 shadow-none">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold">{t("internalComments")}</h2>
        <p className="text-xs text-muted-foreground">
          {t("internalCommentsDescription")}
        </p>
      </div>
      <ControlledTextarea<SubmissionReviewFormValues>
        control={control}
        name="internalComments"
        rows={4}
        disabled={disabled}
        placeholder={t("internalCommentsPlaceholder")}
      />
    </Card>
  );
}
