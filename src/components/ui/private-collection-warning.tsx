import { CircleAlert } from "lucide-react";

import Text from "@/src/components/ui/text";
import { GenericTooltip } from "@/src/components/ui/tooltip";

export function PrivateCollectionWarning({
  label,
  hint,
}: {
  label: string;
  hint: string;
}) {
  return (
    <GenericTooltip
      trigger={
        <span
          className="inline-flex w-fit items-center gap-1 focus-visible:outline-none"
          tabIndex={0}
        >
          <CircleAlert className="size-3.5 text-amber-600" />
          <Text size="xs" weight="medium" className="text-amber-600">
            {label}
          </Text>
        </span>
      }
      content={<span className="block max-w-60">{hint}</span>}
    />
  );
}
