import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";
import type { ComponentProps } from "react";
import {
  SUBMISSION_STATUS_CLASSES,
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatusKey,
} from "@/src/features/cars/submission/submission-types";

export function SubmissionStatusBadge({
  status,
  className,
}: {
  status: SubmissionStatusKey;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(SUBMISSION_STATUS_CLASSES[status], className, "font-normal")}
    >
      {SUBMISSION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function SubmissionSelect({
  className,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-hidden transition-colors",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
