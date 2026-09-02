"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { parseGalleryItemsDraft } from "../gallery-items.schema";
import type { GalleryItemsData } from "../gallery-items.types";

const STORAGE_KEY = "anantara-cms:gallery:items:draft:v1";

export function useGalleryItemsDraft({
  data,
  dirty,
  setData,
}: {
  data: GalleryItemsData;
  dirty: boolean;
  setData: Dispatch<SetStateAction<GalleryItemsData>>;
}) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const restored = parseGalleryItemsDraft(JSON.parse(raw));
      if (restored) setData(restored);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, [setData]);

  useEffect(() => {
    if (!hydrated) return;
    if (!dirty) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, data }),
      );
    } catch {
      // The draft remains editable when browser storage is unavailable.
    }
  }, [data, dirty, hydrated]);
}

export function clearGalleryItemsDraft() {
  window.localStorage.removeItem(STORAGE_KEY);
}
