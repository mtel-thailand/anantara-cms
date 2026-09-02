"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

export const AWARD_DRAFT_STORAGE_VERSION = 1;

type StoredAwardDraft<T> = {
  version: typeof AWARD_DRAFT_STORAGE_VERSION;
  data: T;
};

export function useAwardDraftStorage<T>({
  data,
  dirty,
  parse,
  setData,
  storageKey,
}: {
  data: T;
  dirty: boolean;
  parse: (value: unknown) => T | null;
  setData: Dispatch<SetStateAction<T>>;
  storageKey: string;
}) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;

      const restored = parse(JSON.parse(raw));
      if (restored === null) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      setData(restored);
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHydrated(true);
    }
  }, [parse, setData, storageKey]);

  useEffect(() => {
    if (!hydrated) return;

    if (!dirty) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    try {
      const stored: StoredAwardDraft<T> = {
        version: AWARD_DRAFT_STORAGE_VERSION,
        data,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch {
      // The current draft remains editable if storage is unavailable or full.
    }
  }, [data, dirty, hydrated, storageKey]);
}
