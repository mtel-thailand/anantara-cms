"use client";

import Image from "next/image";
import { Car as CarIcon, Pencil } from "lucide-react";

import type { AwardCar } from "../awards.types";
import { cn } from "@/src/lib/utils";

export function AwardCarThumbnail({
  car,
  className,
  onClick,
  ariaLabel,
}: {
  car: AwardCar;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const thumbnail = (
    <div
      className={cn(
        "relative h-12 w-16 shrink-0 overflow-hidden rounded-md border bg-muted",
        className,
      )}
    >
      {car.imageUrl ? (
        <Image
          src={car.imageUrl}
          alt={car.name}
          fill
          sizes="64px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <CarIcon className="size-5 text-muted-foreground" strokeWidth={1.5} />
      )}
    </div>
  );

  if (!onClick) return thumbnail;

  const label = ariaLabel ?? car.name;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="group/thumb relative block cursor-pointer overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
    >
      {thumbnail}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md opacity-0 transition group-hover/thumb:bg-foreground/45 group-hover/thumb:opacity-100">
        <Pencil className="size-4 text-white" />
      </span>
    </button>
  );
}
