"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Dropdown } from "@/src/components/ui/dropdown/dropdown";
import { useModal } from "@/src/components/providers/modal-provider";
import { cn } from "@/src/lib/utils";
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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Expand,
  ImagePlus,
  MoreHorizontal,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { SubmissionImage } from "@/src/features/cars/submission/submission.types";
import { normalizedFileName } from "@/src/lib/string";

const MIN_IMAGES = 4;
const MAX_IMAGES = 10;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

function ImagePreview({
  images,
  name,
  initialIndex,
}: {
  images: SubmissionImage[];
  name: string;
  initialIndex: number;
}) {
  const [previewIndex, setPreviewIndex] = useState(initialIndex);
  const imageCount = images.length;

  const stepPreview = useCallback(
    (direction: number) => {
      setPreviewIndex(
        (current) => (current + direction + imageCount) % imageCount,
      );
    },
    [imageCount],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") stepPreview(-1);
      if (event.key === "ArrowRight") stepPreview(1);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stepPreview]);

  const previewImage = images[previewIndex];
  if (!previewImage) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex h-[calc(100vh-7rem)] min-h-[240px] w-full items-center justify-center overflow-auto rounded-lg bg-muted">
        <Image
          src={previewImage.url}
          alt={`Image ${previewIndex + 1} of ${name}`}
          fill
          unoptimized={previewImage.url.startsWith("blob:")}
          sizes="min(1024px, 100vw)"
          className="object-contain"
        />
        {previewIndex === 0 ? (
          <Badge className="absolute left-2.5 top-2.5 shadow-sm">
            Main image
          </Badge>
        ) : null}
        {imageCount > 1 ? (
          <>
            <button
              type="button"
              onClick={() => stepPreview(-1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => stepPreview(1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        ) : null}
      </div>
      <p className="text-center text-xs tabular-nums text-muted-foreground">
        {previewIndex + 1} / {imageCount}
      </p>
    </div>
  );
}

function GalleryImage({
  image,
  name,
  onPreview,
  onSetMain,
  onRemove,
  disabled = false,
}: {
  image: SubmissionImage;
  name: string;
  onPreview: () => void;
  onSetMain: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
    >
      <button
        type="button"
        aria-label={`Drag to reorder supporting image of ${name}`}
        className={cn(
          "absolute inset-0 touch-none",
          disabled
            ? "cursor-zoom-in"
            : "cursor-grab active:cursor-grabbing",
        )}
        onClick={disabled ? onPreview : undefined}
        {...(disabled ? {} : attributes)}
        {...(disabled ? {} : listeners)}
      >
        <Image
          src={image.url}
          alt={`Supporting image of ${name}`}
          fill
          unoptimized={image.url.startsWith("blob:")}
          sizes="140px"
          className="object-cover"
        />
      </button>

      <Dropdown
        align="end"
        showSelectedIndicator={false}
        trigger={
          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            aria-label="Image actions"
            className="absolute right-1 top-1 opacity-100 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 sm:data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        }
        options={[
          {
            icon: <Expand className="size-4" />,
            label: "Preview",
            onSelect: () => window.setTimeout(onPreview, 0),
            value: "preview",
          },
          ...(!disabled
            ? [
                {
                  icon: <Star className="size-4" />,
                  label: "Set as main image",
                  onSelect: onSetMain,
                  value: "set-main",
                },
                {
                  className: "text-destructive focus:text-destructive",
                  icon: <Trash2 className="size-4" />,
                  label: "Remove",
                  onSelect: onRemove,
                  value: "remove",
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}

export function CarImageManager({
  images,
  name,
  onChange,
  onFilesAdded,
  required = false,
  invalid = false,
  compact = false,
  disabled = false,
}: {
  images: SubmissionImage[];
  name: string;
  onChange: (images: SubmissionImage[]) => void;
  onFilesAdded?: (files: Array<{ id: string; file: File }>) => void;
  required?: boolean;
  invalid?: boolean;
  compact?: boolean;
  disabled?: boolean;
}) {
  const modal = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const mainImage = images[0];
  const supportingImages = images.slice(1);
  const imageCount = images.length;

  function openPreview(initialIndex: number) {
    modal.open({
      className:
        "max-h-[calc(100vh-2rem)] gap-0 overflow-y-auto bg-popover p-2 sm:max-w-5xl",
      header: <h2 className="sr-only">{name} image preview</h2>,
      headerClassName: "sr-only",
      content: (
        <ImagePreview
          images={images}
          name={name}
          initialIndex={initialIndex}
        />
      ),
    });
    // modal.disableBackdropClose();
  }

  function reorderSupportingImages(event: DragEndEvent) {
    if (disabled) return;

    const { active, over } = event;
    if (!over || active.id === over.id || !mainImage) return;

    const oldIndex = supportingImages.findIndex(
      (image) => image.id === active.id,
    );
    const newIndex = supportingImages.findIndex(
      (image) => image.id === over.id,
    );
    if (oldIndex < 0 || newIndex < 0) return;

    onChange([
      mainImage,
      ...arrayMove(supportingImages, oldIndex, newIndex),
    ]);
  }

  function setMainImage(imageId: string) {
    if (disabled) return;

    const promoted = images.find((image) => image.id === imageId);
    if (!promoted) return;

    onChange([promoted, ...images.filter((image) => image.id !== imageId)]);
    toast.success("Main image updated", {
      description: "Save the submission to keep this order.",
    });
  }

  function removeImage(imageId: string) {
    if (disabled) return;

    const removed = images.find((image) => image.id === imageId);
    if (removed?.url.startsWith("blob:")) URL.revokeObjectURL(removed.url);

    onChange(images.filter((image) => image.id !== imageId));
    toast.success("Image removed");
  }

  function addFiles(files: FileList | null) {
    if (disabled) return;
    if (!files?.length) return;

    const added: SubmissionImage[] = [];
    const addedFiles: Array<{ id: string; file: File }> = [];
    const existingNames = new Set(
      images
        .map((image) => image.fileName)
        .filter((name): name is string => Boolean(name))
        .map(normalizedFileName),
    );
    let rejected = 0;
    let duplicate = 0;

    for (const file of Array.from(files)) {
      if (imageCount + added.length >= MAX_IMAGES) {
        toast.error(`A car can have at most ${MAX_IMAGES} images.`);
        break;
      }

      if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
        rejected += 1;
        continue;
      }

      const fileName = normalizedFileName(file.name);
      if (existingNames.has(fileName)) {
        duplicate += 1;
        continue;
      }

      const id = `temp-image-${crypto.randomUUID()}`;
      added.push({
        contentType: file.type,
        fileName: file.name,
        id,
        size: file.size,
        url: URL.createObjectURL(file),
      });
      addedFiles.push({ id, file });
      existingNames.add(fileName);
    }

    if (added.length) {
      onFilesAdded?.(addedFiles);
      onChange([...images, ...added]);
      toast.success(added.length === 1 ? "Image added" : "Images added", {
        description: `${added.length} preview${added.length === 1 ? "" : "s"} added to the draft.`,
      });
    }

    if (rejected) {
      toast.error(`${rejected} file(s) skipped`, {
        description: "Use JPG or PNG files up to 10MB each.",
      });
    }

    if (duplicate) {
      toast.error(`${duplicate} duplicate file(s) skipped`);
    }
  }

  return (
    <div className="flex flex-col gap-3" data-review-field="images" tabIndex={-1}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">
            Images{required ? <span className="text-destructive"> *</span> : null}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The first image is the cover. Supporting images can be reordered.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || imageCount >= MAX_IMAGES}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="size-4" /> Add image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          disabled={disabled}
          hidden
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {mainImage ? (
        <div
          className={cn(
            "group relative aspect-video overflow-hidden rounded-lg border bg-muted",
            compact && "max-w-xl",
          )}
        >
          <button
            type="button"
            onClick={() => openPreview(0)}
            aria-label={`Preview main image of ${name}`}
            className="absolute inset-0 cursor-zoom-in"
          >
            <Image
              src={mainImage.url}
              alt={`Main image of ${name}`}
              fill
              unoptimized={mainImage.url.startsWith("blob:")}
              sizes={compact ? "576px" : "800px"}
              className="object-cover"
            />
          </button>
          <Badge className="pointer-events-none absolute left-2.5 top-2.5 shadow-sm">
            Main image
          </Badge>
          <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            <Expand className="size-3.5" /> Preview
          </span>
        </div>
      ) : (
        <div
          aria-invalid={invalid || undefined}
          className={cn(
            "flex aspect-video items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground",
            compact && "max-w-xl",
            invalid &&
              "border-destructive text-destructive ring-2 ring-destructive/20",
          )}
        >
          No images yet
        </div>
      )}

      {supportingImages.length ? (
        <>
          <p className="text-xs text-muted-foreground">
            Drag supporting images to reorder, or use the menu to preview,
            promote, or remove.
          </p>
          <DndContext
            id={`car-images-${name}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={reorderSupportingImages}
          >
            <SortableContext
              items={supportingImages.map((image) => image.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className={cn(
                  "grid grid-cols-3 gap-2 sm:grid-cols-4",
                  compact && "max-w-xl",
                )}
              >
                {supportingImages.map((image, index) => (
                  <GalleryImage
                    key={image.id}
                    image={image}
                    name={name}
                    disabled={disabled}
                    onPreview={() => openPreview(index + 1)}
                    onSetMain={() => setMainImage(image.id)}
                    onRemove={() => removeImage(image.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : null}

      <div
        className={cn(
          "flex items-center gap-1.5 text-xs",
          imageCount >= MIN_IMAGES
            ? "text-muted-foreground"
            : "text-amber-700",
        )}
      >
        {imageCount >= MIN_IMAGES ? (
          <CheckCircle2 className="size-3.5" />
        ) : (
          <TriangleAlert className="size-3.5" />
        )}
        {imageCount} of {MIN_IMAGES}-{MAX_IMAGES} images. JPG or PNG, maximum
        10MB each.
      </div>

    </div>
  );
}
