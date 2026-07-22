import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";
import {
  SUBMISSION_STATUS_CLASSES,
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatusKey,
} from "@/src/features/cars/submission/submission.types";

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
