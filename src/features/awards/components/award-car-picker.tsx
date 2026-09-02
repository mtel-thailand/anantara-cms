"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Dropdown } from "@/src/components/ui/dropdown/dropdown";
import { Input } from "@/src/components/ui/input";
import { romanNumeral } from "@/src/features/cars/car-class-number.helpers";
import { cn } from "@/src/lib/utils";
import type { AwardCar, AwardClass } from "../awards.types";
import { AwardCarThumbnail } from "./award-car-thumbnail";

export function AwardCarPicker({
  cars,
  classes,
  currentCarId,
  excludedCarId,
  lockedClassId,
  onSelect,
}: {
  cars: AwardCar[];
  classes: AwardClass[];
  currentCarId?: string | null;
  excludedCarId?: string | null;
  lockedClassId?: number;
  onSelect: (carId: string) => void;
}) {
  const t = useTranslations("awards.common");
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const classById = useMemo(
    () => new Map(classes.map((carClass) => [carClass.id, carClass])),
    [classes],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const selectedClassId =
    classFilter === "all" ? null : Number(classFilter);
  const filteredCars = cars.filter((car) => {
    if (car.id === excludedCarId) return false;
    if (lockedClassId !== undefined && car.categoryId !== lockedClassId) {
      return false;
    }
    if (selectedClassId !== null && car.categoryId !== selectedClassId) {
      return false;
    }
    if (!normalizedQuery) return true;

    return (
      car.name.toLowerCase().includes(normalizedQuery) ||
      car.owner.toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2.5 border-b px-6 py-3">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("pickerSearchPlaceholder")}
            aria-label={t("pickerSearchAria")}
            className="h-10 bg-card pl-9"
          />
        </div>
        {lockedClassId === undefined ? (
          <Dropdown
            value={classFilter}
            onValueChange={setClassFilter}
            aria-label={t("pickerClassFilterAria")}
            className="h-10 w-44 bg-card"
            contentClassName="w-64"
            options={[
              { label: t("allClasses"), value: "all" },
              ...classes.map((carClass) => ({
                label: t("classOption", {
                  name: carClass.name,
                  number: romanNumeral(carClass.sequence),
                }),
                value: String(carClass.id),
              })),
            ]}
          />
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filteredCars.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">
            {t("noCarsMatch")}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {filteredCars.map((car) => {
              const carClass =
                car.categoryId === null
                  ? undefined
                  : classById.get(car.categoryId);

              return (
                <li key={car.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(car.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent",
                      currentCarId === car.id && "bg-accent",
                    )}
                  >
                    <AwardCarThumbnail car={car} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {car.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {carClass
                          ? `${t("classNumber", { number: romanNumeral(carClass.sequence) })} · ${carClass.name} · ${car.owner}`
                          : car.owner}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {car.year}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
