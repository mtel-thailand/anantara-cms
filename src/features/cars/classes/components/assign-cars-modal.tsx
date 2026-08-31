"use client";

import { Plus, Search } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import type { ClassAssignableCar } from "@/src/features/cars/classes/car-classes.types";

export function AssignCarsModal({
  cars,
  onAssign,
}: {
  cars: ClassAssignableCar[];
  onAssign: (car: ClassAssignableCar) => void;
}) {
  const t = useTranslations("cars.classes");
  const [query, setQuery] = useState("");
  const [availableCars, setAvailableCars] = useState(() =>
    cars.filter(({ assignable, categoryId }) => assignable && categoryId === null),
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredCars = useMemo(
    () =>
      availableCars.filter((car) =>
        [car.name, car.owner, car.reference, String(car.year)].some((value) =>
          value.toLocaleLowerCase().includes(normalizedQuery),
        ),
      ),
    [availableCars, normalizedQuery],
  );

  function assign(car: ClassAssignableCar) {
    setAvailableCars((current) => current.filter(({ id }) => id !== car.id));
    onAssign(car);
  }

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchAria")}
        leftButton={{ label: t("searchAria"), icon: Search }}
      />

      <div className="max-h-[45vh] space-y-1 overflow-y-auto pr-1">
        {filteredCars.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            {availableCars.length === 0
              ? t("noUnassignedCars")
              : t("noSearchResults")}
          </div>
        ) : (
          filteredCars.map((car) => (
            <div
              key={car.id}
              className="flex items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2"
            >
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {car.name} · {car.year}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {car.owner} · {t("unassigned")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={Plus}
                onClick={() => assign(car)}
              >
                {t("add")}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
