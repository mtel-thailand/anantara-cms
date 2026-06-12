import { InfoIcon } from "lucide-react";
import { Suspense } from "react";

export default function NotFoundPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          Not found page
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4"></h2>
        <pre className="text-xs font-mono p-3 rounded border max-h-32 overflow-auto">
          <Suspense></Suspense>
        </pre>
      </div>
      <div>
        <h2 className="font-bold text-2xl mb-4"></h2>
      </div>
    </div>
  );
}
