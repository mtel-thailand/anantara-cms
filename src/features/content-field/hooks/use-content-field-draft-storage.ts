"use client";

import { useCallback, useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { contentFieldSnapshot } from "../content-field.helpers";
import { contentFieldDraftStorageSchema } from "../content-field.schema";
import type { ContentFieldFormValues } from "../content-field.schema";
import type {
  ContentFieldData,
  ContentFieldDraft,
} from "../content-field.types";

const DRAFT_STORAGE_VERSION = 5;

function getDraftStorageKey(pageKey: ContentFieldDraft["pageKey"]) {
  return `anantara-cms:content-field:${pageKey}:draft:v${DRAFT_STORAGE_VERSION}`;
}

export function useContentFieldDraftStorage({
  draftData,
  form,
  initialDraft,
  onDraftLoaded,
  publishedDraft,
}: {
  draftData: ContentFieldData;
  form: UseFormReturn<ContentFieldFormValues>;
  initialDraft: ContentFieldDraft;
  onDraftLoaded: () => void;
  publishedDraft: ContentFieldDraft;
}) {
  const [hydrated, setHydrated] = useState(false);
  const storageKey = getDraftStorageKey(initialDraft.pageKey);
  const clearDraft = useCallback(() => {
    window.localStorage.removeItem(storageKey);
  }, [storageKey]);
  const syncDraft = useCallback(
    (data: ContentFieldData) => {
      if (
        contentFieldSnapshot(data) ===
        contentFieldSnapshot(publishedDraft.data)
      ) {
        clearDraft();
        return;
      }

      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            version: DRAFT_STORAGE_VERSION,
            draft: {
              data,
              pageKey: publishedDraft.pageKey,
            },
          }),
        );
      } catch {
        // The draft remains usable in memory if browser storage is unavailable.
      }
    },
    [clearDraft, publishedDraft.data, publishedDraft.pageKey, storageKey],
  );

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(storageKey);
      if (!rawDraft) return;

      const parsed = contentFieldDraftStorageSchema.safeParse(
        JSON.parse(rawDraft),
      );
      if (!parsed.success) {
        clearDraft();
        return;
      }

      if (parsed.data.draft.pageKey === initialDraft.pageKey) {
        form.reset({ data: parsed.data.draft.data });
        onDraftLoaded();
      }
    } catch {
      clearDraft();
    } finally {
      setHydrated(true);
    }
  }, [
    clearDraft,
    form,
    initialDraft.pageKey,
    initialDraft.version,
    onDraftLoaded,
    storageKey,
  ]);

  useEffect(() => {
    if (!hydrated) return;

    syncDraft(draftData);
  }, [draftData, hydrated, syncDraft]);

  useEffect(() => {
    if (!hydrated) return;

    const subscription = form.watch(() => {
      syncDraft(form.getValues("data"));
    });

    const saveBeforePageExit = () => {
      syncDraft(form.getValues("data"));
    };
    window.addEventListener("pagehide", saveBeforePageExit);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("pagehide", saveBeforePageExit);
    };
  }, [form, hydrated, syncDraft]);
}
