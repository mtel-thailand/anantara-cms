"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, RotateCcw, Trash2 } from "lucide-react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { GalleryProgressiveImage } from "../../components/gallery-progressive-image";
import type { GalleryImage } from "../../gallery.types";

export function GalleryImageCard({
  image,
  order,
  labels,
  onView,
  onRemove,
  onRestore,
}: {
  image: GalleryImage;
  order?: number;
  labels: {
    draft: string;
    willRemove: string;
    restore: string;
    viewImage: string;
    removeImage: string;
  };
  onView: () => void;
  onRemove: () => void;
  onRestore: () => void;
}) {
  const sortable = useSortable({ id: image.id, disabled: image.removed });

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        willChange: sortable.isDragging ? "transform" : undefined,
      }}
      className={cn(
        "group relative aspect-[4/3] touch-none overflow-hidden rounded-xl border bg-muted select-none",
        image.removed ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        sortable.isDragging &&
          "z-10 opacity-80 shadow-xl ring-2 ring-primary/40",
      )}
      {...(image.removed ? {} : sortable.attributes)}
      {...(image.removed ? {} : sortable.listeners)}
    >
      <GalleryProgressiveImage
        src={image.imageUrl}
        alt=""
        draggable={false}
        sizes="(min-width: 1280px) 200px, (min-width: 640px) 33vw, 50vw"
        className={cn("object-cover", image.removed && "opacity-40")}
      />
      {order ? (
        <span className="absolute top-2 left-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-white/90 px-1.5 text-xs font-semibold text-foreground shadow-sm ring-1 ring-black/5">
          {order}
        </span>
      ) : null}
      {!image.removed ? (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            title={labels.viewImage}
            aria-label={labels.viewImage}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onView}
            className="flex size-7 items-center justify-center rounded-md bg-white/90 text-foreground shadow-sm ring-1 ring-black/5 hover:bg-white"
          >
            <Eye className="size-4" />
          </button>
          <button
            type="button"
            title={labels.removeImage}
            aria-label={labels.removeImage}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onRemove}
            className="flex size-7 items-center justify-center rounded-md bg-white/90 text-destructive shadow-sm ring-1 ring-black/5 hover:bg-destructive hover:text-white transition-all"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : null}
      {!image.persisted && !image.removed ? (
        <Badge
          variant="outline"
          className="absolute right-2 bottom-2 rounded-full border-primary/30 bg-[#ffedf2] px-2 py-0.5 text-[11px] leading-none font-semibold text-primary shadow-sm"
        >
          {labels.draft}
        </Badge>
      ) : null}
      {image.removed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/45 backdrop-blur-[1px]">
          <Badge variant="outline" className="bg-white text-destructive">
            {labels.willRemove}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            leftIcon={RotateCcw}
            onClick={onRestore}
          >
            {labels.restore}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
