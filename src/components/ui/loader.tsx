import { cn } from "@/src/lib/utils";
import { Loader2 } from "lucide-react";

export default function Loader({
  classname = "text-primary",
}: {
  classname?: string;
}) {
  return (
    <Loader2 className={cn("size-4 animate-spin text-primary", classname)} />
  );
}
