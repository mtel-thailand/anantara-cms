"use client";

import { Skeleton } from "@/src/components/ui/skeleton";

const columnWidths = [
  "w-16",
  "w-36",
  "w-28",
  "w-40",
  "w-16",
  "w-28",
  "w-28",
  "w-28",
  "w-24",
];

export function SubmissionsTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="max-h-none overflow-x-auto overflow-y-visible">
      <table className="w-full min-w-[1050px] border-collapse text-sm">
        <thead className="bg-muted/35">
          <tr className="border-b">
            {columnWidths.map((width, index) => (
              <th key={index} className="p-2 text-left">
                <Skeleton className={`h-4 ${width}`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-card">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b">
              {columnWidths.map((width, columnIndex) => (
                <td key={columnIndex} className="p-2">
                  <Skeleton
                    className={
                      columnIndex === 0 ? "h-12 w-16 rounded-md" : `h-4 ${width}`
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
