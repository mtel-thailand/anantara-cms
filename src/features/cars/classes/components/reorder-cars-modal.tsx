"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { ClassAssignableCar } from "@/src/features/cars/classes/car-classes.types";
import {
  restrictToFirstScrollableAncestor,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import { cn } from "@/src/lib/utils";

function SortableCar({
  car,
  position,
}: {
  car: ClassAssignableCar;
  position: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: car.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2",
        isDragging ? "relative z-10 shadow-md" : "",
      )}
    >
      <button
        type="button"
        className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md hover:bg-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="w-5 shrink-0 text-center text-sm tabular-nums text-muted-foreground">
        {position}
      </span>
      <span className="relative h-9 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
        {car.imageUrl ? (
          <Image
            src={car.imageUrl}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : null}
      </span>
      <div className="w-0 flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium">
          {car.name} · {car.year}
        </p>
        <p className="truncate text-xs text-muted-foreground">{car.owner}</p>
      </div>
    </div>
  );
}

const dragModifiers = [
  restrictToVerticalAxis,
  restrictToFirstScrollableAncestor,
];

export function ReorderCarsModal({
  cars,
  onChange,
}: {
  cars: ClassAssignableCar[];
  onChange: (cars: ClassAssignableCar[]) => void;
}) {
  const t = useTranslations("cars.classes");
  const [orderedCars, setOrderedCars] = useState(cars);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedCars.findIndex(({ id }) => id === active.id);
    const newIndex = orderedCars.findIndex(({ id }) => id === over.id);
    const next = arrayMove(orderedCars, oldIndex, newIndex);
    setOrderedCars(next);
    onChange(next);
  }

  return (
    <div className="max-h-[55vh] space-y-1.5 overflow-y-auto">
      <DndContext
        id="car-class-cars-reorder"
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={dragModifiers}
        autoScroll={false}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedCars.map(({ id }) => id)}
          strategy={verticalListSortingStrategy}
        >
          {orderedCars.map((car, index) => (
            <SortableCar key={car.id} car={car} position={index + 1} />
          ))}
        </SortableContext>
      </DndContext>
      {!orderedCars.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("emptyClass")}
        </p>
      ) : null}
    </div>
  );
}
