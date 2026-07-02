import { Card } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";

function AgendaTableSkeleton({ rows }: { rows: number }) {
  return (
    <Card className="overflow-hidden rounded-lg shadow-none" aria-hidden>
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-14" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="grid min-w-[720px] grid-cols-[110px_80px_minmax(180px,1fr)_minmax(180px,1fr)_100px_96px] border-b px-2">
          {[64, 38, 52, 68, 62].map((width) => (
            <div key={width} className="p-2">
              <Skeleton className="h-3" style={{ width }} />
            </div>
          ))}
          <div className="p-2" />
        </div>

        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="grid min-h-14 min-w-[720px] grid-cols-[110px_80px_minmax(180px,1fr)_minmax(180px,1fr)_100px_96px] items-center border-b px-2 last:border-b-0"
          >
            <div className="p-2">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="p-2">
              <Skeleton className="size-5" />
            </div>
            <div className="p-2">
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="p-2">
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex gap-1 p-2">
              <Skeleton className="h-4 w-7" />
              <Skeleton className="h-4 w-7" />
            </div>
            <div className="flex justify-end gap-1 p-2">
              <Skeleton className="size-8" />
              <Skeleton className="size-8" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function AgendaClientSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading agenda"
      className="flex flex-col gap-7"
    >
      <span className="sr-only">Loading agenda</span>
      <AgendaTableSkeleton rows={3} />
      <AgendaTableSkeleton rows={2} />
    </div>
  );
}
