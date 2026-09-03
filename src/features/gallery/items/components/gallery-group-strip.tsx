"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, RotateCcw } from "lucide-react";

import { cn } from "@/src/lib/utils";
import type { Locale } from "@/src/types/locale";
import type { GalleryGroup } from "../../gallery.types";

function GroupTab({
  group,
  active,
  count,
  locale,
  onSelect,
  onEdit,
  onRestore,
}: {
  group: GalleryGroup;
  active: boolean;
  count: number;
  locale: Locale;
  onSelect: () => void;
  onEdit: () => void;
  onRestore: () => void;
}) {
  const sortable = useSortable({ id: group.id, disabled: group.removed });
  const name = (locale === "it" ? group.nameIt : group.name).trim() || group.name;

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={cn(
        "relative -mb-px flex items-center gap-1.5 border-b-2 px-0.5 pb-2.5 transition-colors",
        active && !group.removed
          ? "border-primary"
          : "border-transparent",
        group.removed && "opacity-45 line-through",
        sortable.isDragging && "z-10 bg-background",
      )}
    >
      <button
        type="button"
        aria-label={name}
        disabled={group.removed}
        className="flex size-5 cursor-grab items-center justify-center text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing disabled:cursor-default disabled:text-muted-foreground/40"
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <button
        type="button"
        disabled={group.removed}
        aria-pressed={active}
        onClick={onSelect}
        className={cn(
          "flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase transition-colors",
          active ? "text-primary" : "text-muted-foreground",
          !group.removed && !active && "hover:text-foreground",
          group.removed && "cursor-default",
        )}
      >
        <span
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px] tabular-nums no-underline",
            active && !group.removed
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
        {name || "—"}
      </button>
      <button
        type="button"
        onClick={group.removed ? onRestore : onEdit}
        className={cn(
          "flex size-5 items-center justify-center rounded transition-colors",
          active && !group.removed
            ? "text-primary hover:text-primary/80"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {group.removed ? <RotateCcw className="size-3.5" /> : <Pencil className="size-3.5" />}
      </button>
    </div>
  );
}

export function GalleryGroupStrip({
  groups,
  counts,
  activeGroupId,
  locale,
  addLabel,
  onSelect,
  onEdit,
  onAdd,
  onRestore,
  onReorder,
}: {
  groups: GalleryGroup[];
  counts: Map<string, number>;
  activeGroupId: string | null;
  locale: Locale;
  addLabel: string;
  onSelect: (id: string) => void;
  onEdit: (group: GalleryGroup) => void;
  onAdd: () => void;
  onRestore: (group: GalleryGroup) => void;
  onReorder: (ids: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const from = groups.findIndex((group) => group.id === event.active.id);
    const to = groups.findIndex((group) => group.id === event.over?.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(groups, from, to).map((group) => group.id));
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b">
      <DndContext
        id="gallery-groups-reorder"
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={groups.map((group) => group.id)} strategy={rectSortingStrategy}>
          {groups.map((group) => (
            <GroupTab
              key={group.id}
              group={group}
              active={group.id === activeGroupId}
              count={counts.get(group.id) ?? 0}
              locale={locale}
              onSelect={() => onSelect(group.id)}
              onEdit={() => onEdit(group)}
              onRestore={() => onRestore(group)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={onAdd}
        className="-mb-px flex items-center gap-1.5 border-b-2 border-transparent px-0.5 pb-2.5 text-xs font-semibold tracking-wide text-primary uppercase hover:text-primary/80"
      >
        <Plus className="size-4" /> {addLabel}
      </button>
    </div>
  );
}
