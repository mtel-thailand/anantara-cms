"use client";

import {
  memo,
  useCallback,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Cell,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  OnChangeFn,
  Row,
  SortingState,
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
import { cn } from "@/src/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";

const genericMemo: <T>(component: T) => T = memo;

export type DraggableTableProps<TData extends { id: string }> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  onReorder: (data: TData[]) => void;
  columnSorting?: SortingState;
  onColumnSortingChange?: OnChangeFn<SortingState>;
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  enableColumnSorting?: boolean;
  enabledRowSorting?: boolean;
  emptyRow?: ReactNode;
  getRowClassName?: (data: TData) => string | undefined;
  canDragRow?: (data: TData) => boolean;
};

const dragModifiers = [
  restrictToVerticalAxis,
  restrictToFirstScrollableAncestor,
];

const DraggableTableComponent = <TData extends { id: string }>({
  data,
  columns,
  onReorder,
  className,
  tableClassName,
  headerClassName,
  bodyClassName,
  enableColumnSorting,
  enabledRowSorting,
  emptyRow,
  getRowClassName,
  canDragRow,
  columnSorting,
  onColumnSortingChange,
}: DraggableTableProps<TData>) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const getRowId = useCallback((row: TData) => row.id, []);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: enableColumnSorting,
    enableMultiSort: false,
    state: {
      sorting: columnSorting,
    },
    onSortingChange: onColumnSortingChange,
  });

  const ids = useMemo(() => data.map(getRowId), [data, getRowId]);
  const emptyColSpan =
    table.getVisibleLeafColumns().length + (enabledRowSorting ? 1 : 0);

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
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={dragModifiers}
      autoScroll={false}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "max-h-[500px] overflow-y-auto overscroll-auto",
          className,
        )}
      >
        <table className={cn("w-full border-collapse", tableClassName)}>
          <thead className={headerClassName}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {enabledRowSorting && <th className="w-10 p-2"></th>}

                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="p-2 text-left"
                    colSpan={header.colSpan}
                  >
                    <div
                      className={cn(
                        "inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors",
                        {
                          "hover:text-foreground cursor-pointer":
                            header.column.getCanSort(),
                        },
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                      title={
                        header.column.getCanSort()
                          ? header.column.getNextSortingOrder() === "asc"
                            ? "Sort ascending"
                            : header.column.getNextSortingOrder() === "desc"
                              ? "Sort descending"
                              : "Clear sort"
                          : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                      {{
                        asc: <ArrowUp className={cn("size-3.5")} />,
                        desc: <ArrowDown className={cn("size-3.5")} />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className={bodyClassName}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {table.getRowModel().rows.length > 0 ? (
                table
                  .getRowModel()
                  .rows.map((row) => (
                    <DraggableRow
                      key={row.id}
                      row={row}
                      sorting={enabledRowSorting}
                      draggable={
                        Boolean(enabledRowSorting) &&
                        (canDragRow?.(row.original) ?? true)
                      }
                      className={getRowClassName?.(row.original)}
                    />
                  ))
              ) : (
                <tr>
                  <td
                    colSpan={emptyColSpan}
                    className="p-0 hover:bg-muted/50 duration-150"
                  >
                    {emptyRow ?? (
                      <div className="flex min-h-20 items-center justify-center px-4 py-6 text-center text-sm text-muted-foreground">
                        No data available.
                      </div>
                    )}
                  </td>
                </tr>
              )}
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
    oldProps.onReorder === newProps.onReorder &&
    oldProps.columnSorting === newProps.columnSorting &&
    oldProps.onColumnSortingChange === newProps.onColumnSortingChange &&
    oldProps.enableColumnSorting === newProps.enableColumnSorting &&
    oldProps.enabledRowSorting === newProps.enabledRowSorting &&
    oldProps.tableClassName === newProps.tableClassName &&
    oldProps.headerClassName === newProps.headerClassName &&
    oldProps.bodyClassName === newProps.bodyClassName &&
    oldProps.className === newProps.className &&
    oldProps.emptyRow === newProps.emptyRow &&
    oldProps.getRowClassName === newProps.getRowClassName &&
    oldProps.canDragRow === newProps.canDragRow
  );
}

const DraggableTable = memo(DraggableTableComponent, arePropsEqual);

function DraggableRowComponent<TData>({
  row,
  sorting,
  draggable,
  className,
}: {
  row: Row<TData>;
  sorting?: boolean;
  draggable: boolean;
  className?: string;
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
    disabled: !draggable,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition
      ? `${transition}, background-color 200ms ease`
      : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn("border-b hover:bg-muted/50", className)}
    >
      {sorting && (
        <td className="p-2">
          <button
            type="button"
            disabled={!draggable}
            {...attributes}
            {...listeners}
            className={cn(
              "touch-none rounded border px-2 py-1",
              draggable
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-not-allowed text-muted-foreground/40",
            )}
          >
            ☰
          </button>
        </td>
      )}

      {row.getVisibleCells().map((cell) => (
        <DraggableCell key={cell.id} cell={cell} />
      ))}
    </tr>
  );
}

const DraggableRow = genericMemo(DraggableRowComponent);

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

const DraggableCell = genericMemo(DraggableCellComponent);

export default DraggableTable;
