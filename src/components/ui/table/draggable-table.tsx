"use client";

import React, { memo, useCallback, useMemo } from "react";
import {
  Cell,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  Row,
  useReactTable,
} from "@tanstack/react-table";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToFirstScrollableAncestor,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";

export type DraggableTableProps<TData extends { id: string }> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  onReorder: (data: TData[]) => void;
};

const dragModifiers = [
  restrictToVerticalAxis,
  restrictToFirstScrollableAncestor,
];

const DraggableTableComponent = <TData extends { id: string }>({
  data,
  columns,
  onReorder,
}: DraggableTableProps<TData>) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const getRowId = (row: TData) => row.id;

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  });

  const ids = useMemo(() => data.map(getRowId), [data, getRowId]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));

      if (oldIndex === -1 || newIndex === -1) return;

      onReorder(arrayMove(data, oldIndex, newIndex));
    },
    [data, ids, onReorder],
  );
  console.log("re-render DraggableTableComponent");
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={dragModifiers}
      autoScroll={false}
      onDragEnd={handleDragEnd}
    >
      <div className="max-h-[500px] overflow-y-auto overscroll-contain">
        <table className="w-full border-collapse border">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-gray-100">
                <th className="w-10 p-2"></th>

                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="p-2 text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {table.getRowModel().rows.map((row) => (
                <DraggableRow key={row.id} row={row} />
              ))}
            </SortableContext>
          </tbody>
        </table>
      </div>
    </DndContext>
  );
};

function arePropsEqual<TData extends { id: string }>(
  oldProps: DraggableTableProps<TData>,
  newProps: DraggableTableProps<TData>,
) {
  return (
    oldProps.data === newProps.data &&
    oldProps.columns === newProps.columns &&
    oldProps.onReorder === newProps.onReorder
  );
}

const DraggableTable = memo(DraggableTableComponent, arePropsEqual);

const DraggableRow = memo(function DraggableRow<TData>({
  row,
}: {
  row: Row<TData>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  console.log("render")
  return (
    <tr ref={setNodeRef} style={style} className="border-b bg-white">
      <td className="p-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab rounded border px-2 py-1 active:cursor-grabbing"
        >
          ☰
        </button>
      </td>

      {row.getVisibleCells().map((cell) => (
        <DraggableCell key={cell.id} cell={cell} />
      ))}
    </tr>
  );
});

function DraggableCellComponent<TData>({
  cell,
}: {
  cell: Cell<TData, unknown>;
}) {
  return (
    <td className="p-2">
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </td>
  );
}

const DraggableCell = memo(
  DraggableCellComponent,
) as typeof DraggableCellComponent;

export default DraggableTable;
