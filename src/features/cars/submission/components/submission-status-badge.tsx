import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";
import {
  SUBMISSION_STATUS_CLASSES,
  SUBMISSION_STATUS_TRANSLATION_KEYS,
  type SubmissionStatusKey,
} from "@/src/features/cars/submission/submission.types";
import { useTranslations } from "next-intl";

export function SubmissionStatusBadge({
  status,
  className,
}: {
  status: SubmissionStatusKey;
  className?: string;
}) {
  const t = useTranslations("cars.submission.list");

  return (
    <Badge
      variant="outline"
      className={cn(SUBMISSION_STATUS_CLASSES[status], className, "font-normal")}
    >
      {t(SUBMISSION_STATUS_TRANSLATION_KEYS[status])}
    </Badge>
  );
}
