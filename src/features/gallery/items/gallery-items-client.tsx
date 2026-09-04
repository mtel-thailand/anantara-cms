"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
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
} from "@dnd-kit/sortable";
import { Eye, Plus, RotateCcw, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { PageHeader } from "@/src/components/page-header";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";
import type { Locale } from "@/src/types/locale";
import { GalleryGroupStrip } from "./components/gallery-group-strip";
import { GalleryImageCard } from "./components/gallery-image-card";
import { publishGalleryItemsAction } from "./gallery-items.actions";
import {
  galleryItemsEqual,
  resequenceGalleryGroups,
  resequenceGalleryImages,
} from "./gallery-items.helpers";
import {
  isSupportedGalleryImage,
  removeGalleryImage,
  uploadGalleryImage,
} from "./gallery-items.media";
import type {
  GalleryGroup,
  GalleryImage,
  GalleryItemsData,
} from "../gallery.types";
import {
  clearGalleryItemsDraft,
  useGalleryItemsDraft,
} from "./hooks/use-gallery-items-draft";
import { useGalleryItemsModals } from "./hooks/use-gallery-items-modals";

export function GalleryItemsClient({
  initialData,
}: {
  initialData: GalleryItemsData;
}) {
  const t = useTranslations("galleryItems");
  const locale = useLocale() as Locale;
  const [published, setPublished] = useState(initialData);
  const [draft, setDraft] = useState(initialData);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modals = useGalleryItemsModals();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const dirty = !galleryItemsEqual(draft, published);
  useGalleryItemsDraft({ data: draft, dirty, setData: setDraft });

  const liveGroups = draft.groups.filter((group) => !group.removed);
  const activeGroup =
    liveGroups.find((group) => group.id === activeGroupId) ??
    liveGroups[0] ??
    null;
  const counts = useMemo(() => {
    const next = new Map<string, number>();
    for (const image of draft.images) {
      if (!image.removed)
        next.set(image.groupId, (next.get(image.groupId) ?? 0) + 1);
    }
    return next;
  }, [draft.images]);
  const activeImages = activeGroup
    ? draft.images.filter((image) => image.groupId === activeGroup.id)
    : [];
  const orderById = new Map<string, number>();
  let order = 0;
  activeImages.forEach((image) => {
    if (!image.removed) orderById.set(image.id, ++order);
  });
  const emptyGroups = liveGroups.filter(
    (group) => (counts.get(group.id) ?? 0) === 0,
  );
  const languageGapGroups = liveGroups.filter((group) => !group.nameIt.trim());
  const activeEmpty = activeGroup
    ? (counts.get(activeGroup.id) ?? 0) === 0
    : false;

  function updateGroup(
    group: GalleryGroup,
    value: { name: string; nameIt: string },
  ) {
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((item) =>
        item.id === group.id ? { ...item, ...value } : item,
      ),
    }));
    toast.success(t("tabUpdated"), { description: t("rememberToPublish") });
  }

  function openGroup(group?: GalleryGroup, initialLanguage?: Locale) {
    modals.openGroupForm({
      group,
      photoCount: group ? (counts.get(group.id) ?? 0) : 0,
      initialLanguage,
      onSave: (value) => {
        if (group) {
          updateGroup(group, value);
          return;
        }
        const next: GalleryGroup = {
          id: `temp-${crypto.randomUUID()}`,
          persisted: false,
          name: value.name,
          nameIt: value.nameIt,
          sequence: liveGroups.length + 1,
          removed: false,
        };
        setDraft((current) => ({
          ...current,
          groups: [...current.groups, next],
        }));
        setActiveGroupId(next.id);
        toast.success(t("tabAdded"), { description: t("rememberToPublish") });
      },
      onRemove: group ? () => removeGroup(group) : undefined,
    });
  }

  function removeGroup(group: GalleryGroup) {
    const groupImages = draft.images.filter(
      (image) => image.groupId === group.id,
    );
    if (!group.persisted) {
      void Promise.allSettled(
        groupImages
          .filter((image) => !image.persisted)
          .map((image) => removeGalleryImage(image.imageKey)),
      );
      setDraft((current) => ({
        groups: resequenceGalleryGroups(
          current.groups.filter((item) => item.id !== group.id),
        ),
        images: current.images.filter((image) => image.groupId !== group.id),
      }));
    } else {
      setDraft((current) => ({
        groups: current.groups.map((item) =>
          item.id === group.id ? { ...item, removed: true } : item,
        ),
        images: current.images.map((image) =>
          image.groupId === group.id ? { ...image, removed: true } : image,
        ),
      }));
    }
    toast.success(t("tabRemoved"), {
      description: group.persisted
        ? t("tabRemovedPublished")
        : t("tabRemovedDraft"),
    });
  }

  async function addImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!activeGroup || !selected.length) return;
    const supported = selected.filter(isSupportedGalleryImage);
    if (!supported.length) {
      toast.error(t("chooseImages"));
      return;
    }
    if (supported.length !== selected.length) {
      toast.warning(t("filesSkipped"), {
        description: t("filesSkippedDescription"),
      });
    }
    setUploading(true);
    const results = await Promise.allSettled(supported.map(uploadGalleryImage));
    setUploading(false);
    const uploaded = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    if (!uploaded.length) {
      toast.error(t("uploadFailed"), { description: t("tryAgain") });
      return;
    }
    setDraft((current) => {
      const start = current.images.filter(
        (image) => image.groupId === activeGroup.id && !image.removed,
      ).length;
      const images: GalleryImage[] = uploaded.map((image, index) => ({
        id: `temp-${crypto.randomUUID()}`,
        persisted: false,
        groupId: activeGroup.id,
        imageKey: image.imageKey,
        imageUrl: image.imageUrl,
        sequence: start + index + 1,
        removed: false,
      }));
      return { ...current, images: [...current.images, ...images] };
    });
    toast.success(t(uploaded.length === 1 ? "photoAdded" : "photosAdded"), {
      description: t("photosAddedDescription", { name: activeGroup.name }),
    });
  }

  function removeImage(image: GalleryImage) {
    modals.openConfirm({
      title: t("removePhotoTitle"),
      description: t("removePhotoDescription"),
      confirmLabel: t("remove"),
      destructive: false,
      onConfirm: () => {
        setDraft((current) => ({
          ...current,
          images: current.images.map((item) =>
            item.id === image.id ? { ...item, removed: true } : item,
          ),
        }));
        toast.success(t("photoRemoved"), {
          description: t("photoRemovedDescription"),
        });
      },
    });
  }

  function reorderImages(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const from = activeImages.findIndex(
      (image) => image.id === event.active.id,
    );
    const to = activeImages.findIndex((image) => image.id === event.over?.id);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(activeImages, from, to);
    setDraft((current) => ({
      ...current,
      images: resequenceGalleryImages([
        ...current.images.filter((image) => image.groupId !== activeGroup?.id),
        ...reordered,
      ]),
    }));
  }

  function discard() {
    modals.openConfirm({
      title: t("discardTitle"),
      description: t("discardDescription"),
      confirmLabel: t("discardChanges"),
      onConfirm: () => {
        void Promise.allSettled(
          draft.images
            .filter((image) => !image.persisted)
            .map((image) => removeGalleryImage(image.imageKey)),
        );
        setDraft(published);
        setValidated(false);
        clearGalleryItemsDraft();
        toast.success(t("changesDiscarded"));
      },
    });
  }

  async function publish() {
    try {
      const removedImages = draft.images.filter((image) => image.removed);
      const canonical = await publishGalleryItemsAction({
        groups: resequenceGalleryGroups(draft.groups),
        images: resequenceGalleryImages(draft.images),
      });
      setPublished(canonical);
      setDraft(canonical);
      setValidated(false);
      clearGalleryItemsDraft();
      void Promise.allSettled(
        removedImages.map((image) => removeGalleryImage(image.imageKey)),
      );
      toast.success(t("published"), { description: t("publishedDescription") });
      return true;
    } catch (error) {
      toast.error(t("publishFailed"), {
        description: error instanceof Error ? error.message : t("tryAgain"),
      });
      return false;
    }
  }

  function requestPublish() {
    if (emptyGroups.length) {
      setValidated(true);
      setActiveGroupId(emptyGroups[0].id);
      toast.error(t("emptyTabTitle"), {
        description: t("emptyTabDescription"),
      });
      return;
    }
    modals.openPublish({
      incompleteCount: languageGapGroups.length,
      onFixContent: () => {
        const group = languageGapGroups[0];
        if (group) {
          setActiveGroupId(group.id);
          openGroup(group, "it");
        }
      },
      onPublish: publish,
    });
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        viewport={["desktop"]}
        titleAccessory={
          dirty ? (
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/5 text-primary"
            >
              {t("unpublishedChanges")}
            </Badge>
          ) : null
        }
      >
        <Button
          variant="outline"
          leftIcon={Eye}
          onClick={() =>
            modals.openPreview(
              liveGroups,
              draft.images.filter((image) => !image.removed),
              locale,
            )
          }
        >
          {t("preview")}
        </Button>
        <Button
          variant="outline"
          leftIcon={RotateCcw}
          disabled={!dirty}
          onClick={discard}
        >
          {t("discardChanges")}
        </Button>
        <Button leftIcon={Upload} disabled={!dirty} onClick={requestPublish}>
          {t("publishChanges")}
        </Button>
      </PageHeader>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="hidden"
        onChange={addImages}
      />
      <div className="flex flex-col gap-6">
        <GalleryGroupStrip
          groups={draft.groups}
          counts={counts}
          activeGroupId={activeGroup?.id ?? null}
          locale={locale}
          addLabel={t("addTabs")}
          onSelect={setActiveGroupId}
          onEdit={openGroup}
          onAdd={() => openGroup()}
          onRestore={(group) => {
            setDraft((current) => ({
              groups: current.groups.map((item) =>
                item.id === group.id ? { ...item, removed: false } : item,
              ),
              images: current.images.map((image) =>
                image.groupId === group.id
                  ? { ...image, removed: false }
                  : image,
              ),
            }));
            toast.success(t("tabRestored"));
          }}
          onReorder={(ids) =>
            setDraft((current) => ({
              ...current,
              groups: resequenceGalleryGroups(
                ids
                  .map((id) => current.groups.find((group) => group.id === id))
                  .filter((group): group is GalleryGroup => Boolean(group)),
              ),
            }))
          }
        />

        {!activeGroup ? (
          <Card className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            {t("noTabs")}
          </Card>
        ) : (
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t("dragHint")}</p>
              <Button
                variant="outline"
                size="sm"
                leftIcon={Plus}
                loading={uploading}
                onClick={() => inputRef.current?.click()}
              >
                {t("addImage")}
              </Button>
            </div>
            {activeImages.length ? (
              <DndContext
                id="gallery-images-reorder"
                sensors={sensors}
                collisionDetection={closestCenter}
                measuring={{
                  droppable: { strategy: MeasuringStrategy.BeforeDragging },
                }}
                modifiers={[restrictToParentElement]}
                onDragEnd={reorderImages}
              >
                <SortableContext
                  items={activeImages.map((image) => image.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {activeImages.map((image) => (
                      <GalleryImageCard
                        key={image.id}
                        image={image}
                        order={orderById.get(image.id)}
                        labels={{
                          draft: t("draft"),
                          willRemove: t("willRemove"),
                          restore: t("restore"),
                          viewImage: t("viewImage"),
                          removeImage: t("removeImage"),
                        }}
                        onView={() => modals.openImage(image.imageUrl)}
                        onRemove={() => removeImage(image)}
                        onRestore={() => {
                          setDraft((current) => ({
                            ...current,
                            images: current.images.map((item) =>
                              item.id === image.id
                                ? { ...item, removed: false }
                                : item,
                            ),
                          }));
                          toast.success(t("photoRestored"));
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div
                className={cn(
                  "flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground",
                  validated &&
                    activeEmpty &&
                    "border-destructive/50 bg-destructive/5 text-destructive",
                )}
              >
                {t("noPhotos")}
              </div>
            )}
            {validated && activeEmpty ? (
              <p className="mt-4 text-sm text-destructive">
                {t("emptyTabInline", {
                  count: Math.max(0, emptyGroups.length - 1),
                })}
              </p>
            ) : null}
          </Card>
        )}
      </div>
    </>
  );
}
