"use client";

import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

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
  dirty,
  draftData,
  form,
  initialDraft,
  publishedDraft,
}: {
  dirty: boolean;
  draftData: ContentFieldData;
  form: UseFormReturn<ContentFieldFormValues>;
  initialDraft: ContentFieldDraft;
  publishedDraft: ContentFieldDraft;
}) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storageKey = getDraftStorageKey(initialDraft.pageKey);
      const rawDraft = window.localStorage.getItem(storageKey);
      if (!rawDraft) return;

      const parsed = contentFieldDraftStorageSchema.safeParse(
        JSON.parse(rawDraft),
      );
      if (!parsed.success) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      if (parsed.data.draft.pageKey === initialDraft.pageKey) {
        form.reset({ data: parsed.data.draft.data });
      }
    } catch {
      window.localStorage.removeItem(getDraftStorageKey(initialDraft.pageKey));
    } finally {
      setHydrated(true);
    }
  }, [form, initialDraft.pageKey, initialDraft.version]);

  useEffect(() => {
    if (!hydrated) return;

    if (!dirty) {
      window.localStorage.removeItem(getDraftStorageKey(initialDraft.pageKey));
      return;
    }

    try {
      window.localStorage.setItem(
        getDraftStorageKey(initialDraft.pageKey),
        JSON.stringify({
          version: DRAFT_STORAGE_VERSION,
          draft: {
            data: draftData,
            pageKey: publishedDraft.pageKey,
          },
        }),
      );
    } catch {
      // The draft remains usable in memory if browser storage is unavailable.
    }
  }, [draftData, dirty, hydrated, initialDraft.pageKey, publishedDraft]);
}
