"use client";

import React, { useRef } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragMoveEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";

type DraggableTableProps<TData extends { id: string }> = {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  onReorder: (data: TData[]) => void;
  getRowId?: (row: TData) => string;
};

export function DraggableTable<TData extends { id: string }>({
  data,
  columns,
  onReorder,
  getRowId = (row) => row.id,
}: DraggableTableProps<TData>) {
  const sensors = useSensors(useSensor(PointerSensor));

  const containerRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  });

  const ids = data.map(getRowId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));

    onReorder(arrayMove(data, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <div ref={containerRef} className="max-h-[500px] overflow-y-auto">
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
}

function DraggableRow<TData>({ row }: { row: any }) {
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

  return (
    <tr ref={setNodeRef} style={style} className="border-b bg-white">
      <td className="p-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab rounded border px-2 py-1 active:cursor-grabbing"
        >
          ☰
        </button>
      </td>

      {row.getVisibleCells().map((cell: any) => (
        <td key={cell.id} className="p-2">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}
