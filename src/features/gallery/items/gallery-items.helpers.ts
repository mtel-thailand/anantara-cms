import type {
  GalleryGroup,
  GalleryImage,
  GalleryItemsData,
} from "../gallery.types";

export function resequenceGalleryGroups(groups: GalleryGroup[]) {
  let sequence = 0;
  return groups.map((group) =>
    group.removed ? group : { ...group, sequence: ++sequence },
  );
}

export function resequenceGalleryImages(images: GalleryImage[]) {
  const sequences = new Map<string, number>();
  return images.map((image) => {
    if (image.removed) return image;
    const sequence = (sequences.get(image.groupId) ?? 0) + 1;
    sequences.set(image.groupId, sequence);
    return { ...image, sequence };
  });
}

export function normalizedGalleryItems(data: GalleryItemsData) {
  return {
    groups: data.groups
      .map(({ id, persisted, name, nameIt, sequence, removed }) => ({
        id,
        persisted,
        name: name.trim(),
        nameIt: nameIt.trim(),
        sequence,
        removed,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    images: data.images
      .map(({ id, persisted, groupId, imageKey, sequence, removed }) => ({
        id,
        persisted,
        groupId,
        imageKey,
        sequence,
        removed,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export function galleryItemsEqual(
  left: GalleryItemsData,
  right: GalleryItemsData,
) {
  return (
    JSON.stringify(normalizedGalleryItems(left)) ===
    JSON.stringify(normalizedGalleryItems(right))
  );
}
