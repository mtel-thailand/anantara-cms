"use client";

import dynamic from "next/dynamic";
import type { DraggableTableProps } from "./draggable-table";
import type { ReactElement } from "react";
import Loader from "@/src/components/ui/loader";

const DynamicDraggableTable = dynamic(
  () => import("@/src/components/ui/table/draggable-table"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-10 flex items-center justify-center">
        <Loader />
      </div>
    ),
  },
) as <TData extends { id: string }>(
  props: DraggableTableProps<TData>,
) => ReactElement;

const ClientSideDraggableTable = <TData extends { id: string }>(
  props: DraggableTableProps<TData>,
) => {
  const Table = DynamicDraggableTable;

  return <Table {...props} />;
};

export default ClientSideDraggableTable;
