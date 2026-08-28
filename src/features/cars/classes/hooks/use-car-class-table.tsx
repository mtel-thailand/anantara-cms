"use client";

import {
  ArrowUpDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { romanNumeral } from "@/src/features/cars/car-class-number.helpers";
import { cn } from "@/src/lib/utils";

import type { CarClass, CarClassRow } from "../car-classes.types";
import Text from "@/src/components/ui/text";

type Options = {
  expandedClassId: string | null;
  livePositions: Map<string, number>;
  publishedClasses: CarClass[];
  setExpandedClassId: (id: string | null) => void;
  restoreClass: (id: string) => void;
  openReorderCars: (carClass: CarClass) => void;
  openAssignCars: (carClass: CarClass) => void;
  openClassForm: (carClass: CarClass) => void;
  openRemoveClass: (carClass: CarClass) => void;
};

export function useCarClassTable({
  expandedClassId,
  livePositions,
  publishedClasses,
  setExpandedClassId,
  restoreClass,
  openReorderCars,
  openAssignCars,
  openClassForm,
  openRemoveClass,
}: Options) {
  const t = useTranslations("cars.classes");

  return useMemo<ColumnDef<CarClassRow, unknown>[]>(
    () => [
      {
        id: "expand",
        header: "",
        enableSorting: false,
        size: 36,
        cell: ({ row }) => {
          const carClass = row.original;
          const expanded = expandedClassId === carClass.id && !carClass.removed;

          return (
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              disabled={carClass.removed}
              aria-expanded={expanded}
              onClick={() => setExpandedClassId(expanded ? null : carClass.id)}
            >
              <ChevronRight
                className={cn(
                  "size-4 transition-transform",
                  expanded && "rotate-90",
                )}
              />
            </button>
          );
        },
      },

      {
        id: "order",
        header: t("order"),
        enableSorting: false,
        size: 112,
        cell: ({ row }) => {
          const position = livePositions.get(row.original.id) ?? null;

          return (
            <span className="text-sm font-medium text-muted-foreground">
              <Text size="sm" color="muted-foreground">
                {" "}
                {position
                  ? t("classNumber", {
                      number: romanNumeral(position),
                    })
                  : "—"}
              </Text>
            </span>
          );
        },
      },

      {
        id: "name",
        accessorKey: "name",
        header: t("className"),
        enableSorting: true,
        sortDescFirst: false,
        cell: ({ row }) => {
          const carClass = row.original;

          const published = publishedClasses.find(
            ({ id }) => id === carClass.id,
          );

          const isDraft = !published || published.name !== carClass.name;

          return (
            <div className="flex items-center gap-2">
              <Text
                weight="medium"
                size="sm"
                className={cn(carClass.removed && "line-through")}
              >
                {carClass.name}
              </Text>

              {carClass.removed ? (
                <Badge
                  variant="outline"
                  className="border-destructive/30 text-destructive"
                >
                  {t("willRemove")}
                </Badge>
              ) : isDraft ? (
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/5 text-primary"
                >
                  {t("draft")}
                </Badge>
              ) : null}
            </div>
          );
        },
      },

      {
        id: "cars",
        accessorKey: "carCount",
        header: t("cars"),
        enableSorting: true,
        sortDescFirst: false,
        sortingFn: "basic",
        size: 96,
        cell: ({ getValue }) => (
          <div className="text-center text-sm tabular-nums">
            {getValue<number>()}
          </div>
        ),
      },

      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 380,
        cell: ({ row }) => {
          const carClass = row.original;

          if (carClass.removed) {
            return (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={Undo2}
                  onClick={() => restoreClass(carClass.id)}
                >
                  {t("restore")}
                </Button>
              </div>
            );
          }

          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                leftIcon={ArrowUpDown}
                disabled={carClass.carCount < 2}
                onClick={() => openReorderCars(carClass)}
              >
                {t("reorderCars")}
              </Button>

              <Button
                variant="outline"
                size="sm"
                leftIcon={Plus}
                onClick={() => openAssignCars(carClass)}
              >
                {t("addCars")}
              </Button>

              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("editClass")}
                onClick={() => openClassForm(carClass)}
              >
                <Pencil className="text-muted-foreground size-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("deleteClass")}
                onClick={() => openRemoveClass(carClass)}
              >
                <Trash2 className="text-muted-foreground size-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [
      expandedClassId,
      livePositions,
      openAssignCars,
      openClassForm,
      openRemoveClass,
      openReorderCars,
      publishedClasses,
      restoreClass,
      setExpandedClassId,
      t,
    ],
  );
}
