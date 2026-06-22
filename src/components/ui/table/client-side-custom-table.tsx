"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { DraggableTableProps } from "./draggable-table";

const DynamicDraggableTable = dynamic<DraggableTableProps<any>>(
  () => import("@/src/components/ui/table/draggable-table"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border p-4 text-sm text-muted-foreground">
        Loading table...
      </div>
    ),
  },
);

const ClientSideDraggableTable = <TData extends { id: string }>(
  props: DraggableTableProps<TData>,
) => {
  const Table = DynamicDraggableTable;

  return <Table {...props} />;
};

export default ClientSideDraggableTable;
