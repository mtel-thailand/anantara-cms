"use client";

import ControlledDropdown from "@/src/components/form/dropdown";
import ControlledTextarea from "@/src/components/form/textarea";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { SubmissionStatusBadge } from "@/src/features/cars/submission/components/submission-status-badge";
import type { SubmissionReviewFormValues } from "@/src/features/cars/submission/review/submission-review.schema";
import {
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatus,
} from "@/src/features/cars/submission/submission.types";
import { formatDate } from "@/src/lib/date";
import { Plus } from "lucide-react";
import type {
  Control,
  FieldErrors,
  UseFormClearErrors,
  UseFormSetValue,
} from "react-hook-form";

type ReviewFormControlProps = {
  clearErrors: UseFormClearErrors<SubmissionReviewFormValues>;
  control: Control<SubmissionReviewFormValues>;
  errors: FieldErrors<SubmissionReviewFormValues>;
};

export function ReviewDecisionCard({
  clearErrors,
  control,
  draft,
  errors,
  liveStatus,
  setShowMessageComposer,
  setValue,
  showMessageComposer,
  statusChanged,
  statusOptions,
  willSaveStatus,
}: ReviewFormControlProps & {
  draft: SubmissionReviewFormValues;
  liveStatus: SubmissionStatus;
  setShowMessageComposer: (show: boolean) => void;
  setValue: UseFormSetValue<SubmissionReviewFormValues>;
  showMessageComposer: boolean;
  statusChanged: boolean;
  statusOptions: Array<{ label: string; value: string }>;
  willSaveStatus: SubmissionStatus;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5 shadow-none">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold">Review decision</h2>
        <p className="text-xs text-muted-foreground">
          Change the status to move this submission through the workflow.
          Changes save immediately.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-4">
          {liveStatus === "archived" ? (
            <Input
              label="Status"
              value={SUBMISSION_STATUS_LABELS[liveStatus]}
              disabled
              className="disabled:cursor-default disabled:opacity-100"
            />
          ) : (
            <ControlledDropdown<SubmissionReviewFormValues>
              control={control}
              name="status"
              label="Status"
              options={statusOptions}
              onValueChange={(value) => {
                clearErrors("newInfoMessage");
                if (value !== "requested_info") {
                  setValue("newInfoMessage", "", {
                    shouldDirty: true,
                    shouldValidate: false,
                  });
                  setShowMessageComposer(false);
                }
              }}
            />
          )}

          {statusChanged ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Status</span>
              <SubmissionStatusBadge status={liveStatus} />
              <span className="text-muted-foreground">on save</span>
              <SubmissionStatusBadge status={willSaveStatus} />
            </div>
          ) : null}
        </div>
      </div>

      {draft.status === "requested_info" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-semibold">
              Messages to the owner
              {!draft.infoRequests.length ? (
                <span className="text-destructive"> *</span>
              ) : null}
            </h3>
            <p className="text-xs text-muted-foreground">
              Each message is emailed to the owner with a link to their
              pre-filled form.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {draft.infoRequests.map((request) => (
              <div key={request.id} className="flex flex-col gap-1">
                <Textarea
                  value={request.message}
                  rows={3}
                  disabled
                  className="resize-none bg-muted/40 disabled:cursor-default disabled:opacity-100"
                />
                <span className="text-xs text-muted-foreground">
                  Sent {formatDate(request.sentDate)}
                </span>
              </div>
            ))}

            {!draft.infoRequests.length || showMessageComposer ? (
              <ControlledTextarea<SubmissionReviewFormValues>
                control={control}
                name="newInfoMessage"
                label={draft.infoRequests.length ? "New message" : undefined}
                data-review-field="infoRequest"
                aria-invalid={Boolean(errors.newInfoMessage)}
                error={{
                  hasError: Boolean(errors.newInfoMessage),
                  message: errors.newInfoMessage?.message,
                }}
                rows={4}
                placeholder="Explain what's missing or needs clarifying — e.g. “Please upload a clear front-view photo showing the number plate and attach the restoration records.”"
                onValueChange={() => {
                  clearErrors("newInfoMessage");
                }}
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setShowMessageComposer(true)}
              >
                <Plus className="size-4" /> Request more info
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
