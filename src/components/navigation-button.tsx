import { ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";

export default function NavigationButton({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="mb-4 -ml-2"
      onClick={onClick}
    >
      <ChevronLeft className="size-4" /> {text}
    </Button>
  );
}
