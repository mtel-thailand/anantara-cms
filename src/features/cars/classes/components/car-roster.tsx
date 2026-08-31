"use client";

import { Eye, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { SubmissionStatusBadge } from "@/src/features/cars/submission/components/submission-status-badge";
import type { ClassAssignableCar } from "../car-classes.types";

type CarRosterProps = {
  cars: ClassAssignableCar[];
  onOpen: (car: ClassAssignableCar) => void;
  onRemove: (car: ClassAssignableCar) => void;
};

export function CarRoster({ cars, onOpen, onRemove }: CarRosterProps) {
  const t = useTranslations("cars.classes");

  if (!cars.length) {
    return (
      <p className="px-6 py-6 text-left text-sm text-muted-foreground">
        {t("emptyClass")}
      </p>
    );
  }

  return (
    <div className="px-8 py-2">
      <div className="grid grid-cols-[minmax(0,1fr)_5rem_15rem_7rem_4rem] gap-4 border-b py-2 text-xs text-muted-foreground">
        <span>{t("vehicle")}</span>
        <span>{t("year")}</span>
        <span>{t("owner")}</span>
        <span>{t("statusLabel")}</span>
        <span />
      </div>

      {cars.map((car) => (
        <div
          key={car.id}
          className="grid grid-cols-[minmax(0,1fr)_5rem_15rem_7rem_4rem] items-center gap-4 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
              {car.imageUrl ? (
                <Image
                  src={car.imageUrl}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : null}
            </span>

            <span className="truncate text-sm font-medium">{car.name}</span>
          </div>

          <span className="text-sm text-muted-foreground">{car.year}</span>

          <span className="truncate text-sm text-muted-foreground">
            {car.owner}
          </span>

          {car.status ? (
            <SubmissionStatusBadge status={car.status} />
          ) : (
            <Badge variant="outline" className="w-fit text-muted-foreground">
              —
            </Badge>
          )}

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("viewCar", { car: car.name })}
              onClick={() => onOpen(car)}
            >
              <Eye className="text-muted-foreground size-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("removeCarAria", { car: car.name })}
              onClick={() => onRemove(car)}
            >
              <Trash2 className="text-muted-foreground size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
