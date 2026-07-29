import {
  OWNER_RESERVATION_STATUSES,
  OwnerFormStatus,
} from "../owner-reservation-list.types";
import { cn } from "@/src/lib/utils";

export const FORM_STATUS_LABELS: Record<OwnerFormStatus, string> = {
  required: "Required",
  requested: "Requested",
  received: "Received",
  approved: "Approved",
};

const STATUS_FILL: Record<OwnerFormStatus, string> = {
  required: "bg-amber-600",
  requested: "bg-sky-600",
  received: "bg-teal-600",
  approved: "bg-emerald-600",
};

export function FormStatusChip({
  status,
  steps = OWNER_RESERVATION_STATUSES,
}: {
  status: OwnerFormStatus;
  steps?: readonly OwnerFormStatus[];
}) {
  const currentIndex = steps.indexOf(status);
  const fill = STATUS_FILL[status];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-0.5">
        {steps.map((step, i) => {
          const filled = i <= currentIndex;
          const isFirst = i === 0;
          const isLast = i === steps.length - 1;
          return (
            <span
              key={step}
              className={cn(
                "h-1.5 w-9",
                // Round only the outer ends of the whole bar; inner edges stay square.
                isFirst && "rounded-l-full",
                isLast && "rounded-r-full",
                filled ? fill : "bg-muted",
              )}
            />
          );
        })}
      </div>
      <span className="text-xs font-medium text-foreground">
        {FORM_STATUS_LABELS[status]}
      </span>
    </div>
  );
}
