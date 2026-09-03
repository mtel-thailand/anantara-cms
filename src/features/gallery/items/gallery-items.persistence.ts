import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/src/types/database.types";
import type { PublishGalleryItemsInput } from "./gallery-items.schema";
import type { GalleryItemsData } from "../gallery.types";

type ServerSupabaseClient = SupabaseClient<Database>;

function absoluteImageUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_PUBLIC_BASE_URL?.trim() || "";
  return baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/${value.replace(/^\//, "")}`
    : value;
}

export async function getGalleryItemsData(
  supabase: ServerSupabaseClient,
): Promise<GalleryItemsData> {
  const [groupsResult, imagesResult] = await Promise.all([
    supabase
      .from("gallery_groups")
      .select("id, name, name_it, sequence")
      .order("sequence", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("gallery_image")
      .select("id, gallery_group_id, image, sequence")
      .order("sequence", { ascending: true })
      .order("id", { ascending: true }),
  ]);
  if (groupsResult.error) throw groupsResult.error;
  if (imagesResult.error) throw imagesResult.error;

  return {
    groups: groupsResult.data.map((group) => ({
      id: group.id,
      persisted: true,
      name: group.name,
      nameIt: group.name_it ?? "",
      sequence: group.sequence,
      removed: false,
    })),
    images: imagesResult.data.map((image) => ({
      id: image.id,
      persisted: true,
      groupId: image.gallery_group_id,
      imageKey: image.image,
      imageUrl: absoluteImageUrl(image.image),
      sequence: image.sequence ?? 1,
      removed: false,
    })),
  };
}

export async function publishGalleryItems(
  supabase: ServerSupabaseClient,
  input: PublishGalleryItemsInput,
) {
  const [currentGroupsResult, currentImagesResult] = await Promise.all([
    supabase.from("gallery_groups").select("id"),
    supabase.from("gallery_image").select("id"),
  ]);
  if (currentGroupsResult.error) throw currentGroupsResult.error;
  if (currentImagesResult.error) throw currentImagesResult.error;

  const groupIdMap = new Map<string, string>();
  const liveGroups = input.groups
    .filter((group) => !group.removed)
    .sort((left, right) => left.sequence - right.sequence);
  const updatedAt = new Date().toISOString();

  const groupRows = liveGroups.map((group, index) => {
    const databaseId = group.persisted ? group.id : randomUUID();
    groupIdMap.set(group.id, databaseId);
    return {
      id: databaseId,
      name: group.name.trim(),
      name_it: group.nameIt.trim() || null,
      sequence: index + 1,
      updated_at: updatedAt,
    };
  });

  if (groupRows.length) {
    const { error } = await supabase
      .from("gallery_groups")
      .upsert(groupRows, { onConflict: "id" });
    if (error) throw error;
  }

  const retainedImageIds = new Set<string>();
  const imagesByGroup = new Map<string, typeof input.images>();
  for (const image of input.images) {
    if (image.removed || !groupIdMap.has(image.groupId)) continue;
    const groupImages = imagesByGroup.get(image.groupId) ?? [];
    groupImages.push(image);
    imagesByGroup.set(image.groupId, groupImages);
  }

  const imageRows = liveGroups.flatMap((group) => {
    const databaseGroupId = groupIdMap.get(group.id);
    if (!databaseGroupId) return [];
    const images = (imagesByGroup.get(group.id) ?? []).sort(
      (left, right) => left.sequence - right.sequence,
    );

    return images.map((image, index) => {
      const databaseId = image.persisted ? image.id : randomUUID();
      retainedImageIds.add(databaseId);
      return {
        id: databaseId,
        gallery_group_id: databaseGroupId,
        image: image.imageKey,
        sequence: index + 1,
      };
    });
  });

  if (imageRows.length) {
    const { error } = await supabase
      .from("gallery_image")
      .upsert(imageRows, { onConflict: "id" });
    if (error) throw error;
  }

  const imageIdsToDelete = currentImagesResult.data
    .filter((image) => !retainedImageIds.has(image.id))
    .map((image) => image.id);
  if (imageIdsToDelete.length) {
    const { error } = await supabase
      .from("gallery_image")
      .delete()
      .in("id", imageIdsToDelete);
    if (error) throw error;
  }

  const retainedGroupIds = new Set(groupIdMap.values());
  const groupIdsToDelete = currentGroupsResult.data
    .filter((group) => !retainedGroupIds.has(group.id))
    .map((group) => group.id);
  if (groupIdsToDelete.length) {
    const { error } = await supabase
      .from("gallery_groups")
      .delete()
      .in("id", groupIdsToDelete);
    if (error) throw error;
  }

  return getGalleryItemsData(supabase);
}
