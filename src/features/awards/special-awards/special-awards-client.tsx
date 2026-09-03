"use client";

import { useState } from "react";
import Image from "next/image";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { PenLine, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { PageHeader } from "@/src/components/page-header";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { LanguageChips } from "@/src/components/ui/language-chips";
import ClientSideDraggableTable from "@/src/components/ui/table/client-side-custom-table";
import { cn } from "@/src/lib/utils";
import { publishContentFieldAction } from "@/src/features/content-field/content-field.actions";
import { AwardDescriptionCard } from "../components/award-description-card";
import { AwardCarThumbnail } from "../components/award-car-thumbnail";
import { useAwardModals } from "../hooks/use-award-modals";
import { useAwardDraftStorage } from "../hooks/use-award-draft-storage";
import { useSpecialAwardModal } from "./hooks/use-special-award-modal";
import { publishSpecialAwardsAction } from "../awards.actions";
import {
  storedSpecialAwardsDraft,
  type SpecialAwardsDraft,
} from "../awards.schema";
import type {
  AwardPageInitialData,
  SpecialAwardItem,
  SpecialAwardsData,
} from "../awards.types";
import type { Locale } from "@/src/types/locale";
import BlankPerson from "@/public/images/awards/person.png";
import Text from "@/src/components/ui/text";

const snapshot = (value: unknown) => JSON.stringify(value);

function specialAwardsSnapshot(items: SpecialAwardItem[]) {
  return snapshot(
    items.map((item, index) => ({ ...item, sequence: index + 1 })),
  );
}

const SPECIAL_AWARDS_DRAFT_STORAGE_KEY =
  "anantara-cms:awards:special-awards:draft:v1";

function localizedAwardText(english: string, italian: string, locale: Locale) {
  const preferred = locale === "it" ? italian : english;
  const fallback = locale === "it" ? english : italian;

  return preferred.trim() || fallback.trim() || "—";
}

function awardLanguageAvailability(item: SpecialAwardItem) {
  return {
    en: Boolean(
      item.title.trim() && (item.kind === "car" || item.description.trim()),
    ),
    it: Boolean(
      item.titleIt.trim() && (item.kind === "car" || item.descriptionIt.trim()),
    ),
  };
}

function translationReviewRank(item: SpecialAwardItem) {
  if (item.removed) return 3;

  const availability = awardLanguageAvailability(item);

  if (availability.en !== availability.it) return 0;
  if (!availability.en) return 1;

  return 2;
}

function hasLanguageGap(item: SpecialAwardItem) {
  return translationReviewRank(item) === 0;
}

export function SpecialAwardsClient({
  initialData,
}: {
  initialData: AwardPageInitialData<SpecialAwardsData>;
}) {
  const t = useTranslations("awards.specialAwards");
  const commonT = useTranslations("awards.common");
  const displayLocale = useLocale() as Locale;
  const [publishedAwards, setPublishedAwards] = useState(initialData.awards);
  const [publishedContent, setPublishedContent] = useState(initialData.content);
  const [draft, setDraft] = useState<SpecialAwardsDraft>({
    items: initialData.awards.items,
    content: initialData.content.data,
  });
  const [
    prioritizeIncompleteTranslations,
    setPrioritizeIncompleteTranslations,
  ] = useState(false);
  const [columnSorting, setColumnSorting] = useState<SortingState>([]);
  const { openConfirm, openDescription, openPublish } = useAwardModals();
  const openAwardForm = useSpecialAwardModal();
  const carById = new Map(publishedAwards.cars.map((car) => [car.id, car]));
  const contentDirty =
    snapshot(draft.content) !== snapshot(publishedContent.data);
  const dirty =
    specialAwardsSnapshot(draft.items) !==
      specialAwardsSnapshot(publishedAwards.items) || contentDirty;
  const incompleteTranslationCount = draft.items.filter(hasLanguageGap).length;
  const reviewingIncompleteTranslations =
    prioritizeIncompleteTranslations && incompleteTranslationCount > 0;
  const displayedItems = reviewingIncompleteTranslations
    ? draft.items
        .map((item, index) => ({ item, index }))
        .sort(
          (left, right) =>
            translationReviewRank(left.item) -
              translationReviewRank(right.item) || left.index - right.index,
        )
        .map(({ item }) => item)
    : draft.items;

  useAwardDraftStorage({
    data: draft,
    dirty,
    parse: storedSpecialAwardsDraft,
    setData: setDraft,
    storageKey: SPECIAL_AWARDS_DRAFT_STORAGE_KEY,
  });

  function editDescription() {
    openDescription({
      initialData: draft.content,
      title: commonT("editDescriptionTitle"),
      description: commonT("descriptionDialogDescription"),
      cancelLabel: commonT("cancel"),
      saveLabel: commonT("saveDescription"),
      labels: {
        field: commonT("descriptionField"),
        requiredError: commonT("descriptionRequired"),
      },
      onSave: (content) => {
        setDraft((current) => ({ ...current, content }));
        toast.success(commonT("descriptionUpdated"), {
          description: commonT("rememberToPublish"),
        });
      },
    });
  }

  function saveAward(
    editing: SpecialAwardItem | undefined,
    value: Omit<SpecialAwardItem, "id" | "persisted" | "sequence" | "removed">,
  ) {
    setDraft((current) => ({
      ...current,
      items: editing
        ? current.items.map((item) =>
            item.id === editing.id ? { ...item, ...value } : item,
          )
        : [
            ...current.items,
            {
              ...value,
              id: `temp-${crypto.randomUUID()}`,
              persisted: false,
              removed: false,
              sequence:
                current.items.filter((item) => !item.removed).length + 1,
            },
          ],
    }));
    toast.success(editing ? t("awardUpdated") : t("awardAdded"), {
      description: commonT("rememberToPublish"),
    });
  }

  function removeAward(item: SpecialAwardItem) {
    setDraft((current) => ({
      ...current,
      items: item.persisted
        ? current.items.map((award) =>
            award.id === item.id ? { ...award, removed: true } : award,
          )
        : current.items.filter((award) => award.id !== item.id),
    }));
    toast.success(t("markedForRemoval"), {
      description: commonT("rememberToPublish"),
    });
  }

  const columns: ColumnDef<SpecialAwardItem, unknown>[] = [
    {
      id: "image",
      header: commonT("image"),
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original;
        const car = item.carId ? carById.get(item.carId) : undefined;
        if (car) return <AwardCarThumbnail car={car} />;
        return (
          <div className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.personName || item.title}
                fill
                sizes="62px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <Image
                src={BlankPerson}
                alt={item.personName || item.title}
                fill
                sizes="62px"
                className="object-cover"
                unoptimized
              />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "kind",
      header: t("awardType"),
      enableSorting: true,
      cell: ({ row }) => (
        <Badge variant="outline" className="whitespace-nowrap font-normal">
          {t(row.original.kind === "car" ? "carAward" : "notableFigure")}
        </Badge>
      ),
    },
    {
      accessorKey: "title",
      header: t("awardTitle"),
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-2">
            <Text
              size="sm"
              weight="medium"
              className={cn(row.original.removed && "line-through")}
            >
              {localizedAwardText(
                row.original.title,
                row.original.titleIt,
                displayLocale,
              )}
            </Text>
            {row.original.removed ? (
              <Badge variant="outline" className="text-destructive">
                {t("willRemove")}
              </Badge>
            ) : null}
          </div>
          {row.original.kind === "figure" && row.original.personName ? (
            <span className="block text-xs text-muted-foreground">
              {row.original.personName}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "languages",
      header: t("languages"),
      accessorFn: translationReviewRank,
      enableSorting: true,
      cell: ({ row }) => {
        const availability = awardLanguageAvailability(row.original);

        return <LanguageChips availability={availability} />;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex justify-end gap-1">
            {item.removed ? (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={RotateCcw}
                onClick={() => {
                  setDraft((current) => ({
                    ...current,
                    items: current.items.map((award) =>
                      award.id === item.id
                        ? { ...award, removed: false }
                        : award,
                    ),
                  }));
                  toast.success(t("awardRestored"), {
                    description: commonT("rememberToPublish"),
                  });
                }}
              >
                {commonT("restore")}
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-black"
                  aria-label={commonT("edit")}
                  onClick={() =>
                    openAwardForm({
                      editing: item,
                      cars: publishedAwards.cars,
                      classes: publishedAwards.classes,
                      onSave: (value) => saveAward(item, value),
                    })
                  }
                >
                  <PenLine />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-primary"
                  aria-label={commonT("remove")}
                  onClick={() =>
                    openConfirm({
                      title: t("removeTitle"),
                      description: t("removeDescription"),
                      confirmLabel: commonT("remove"),
                      cancelLabel: commonT("cancel"),
                      destructive: false,
                      onConfirm: () => removeAward(item),
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  function onReorder(items: SpecialAwardItem[]) {
    setDraft((current) => ({
      ...current,
      items: items.map((item, index) => ({
        ...item,
        sequence: index + 1,
      })),
    }));
  }

  async function publish() {
    try {
      const sequencedItems = draft.items.map((item, index) => ({
        ...item,
        sequence: index + 1,
      }));
      const [canonicalAwards, canonicalContent] = await Promise.all([
        publishSpecialAwardsAction({ items: sequencedItems }),
        contentDirty
          ? publishContentFieldAction({
              data: draft.content,
              pageKey: publishedContent.pageKey,
            })
          : Promise.resolve(publishedContent),
      ]);
      setPublishedAwards(canonicalAwards);
      setPublishedContent(canonicalContent);
      setDraft({
        items: canonicalAwards.items,
        content: canonicalContent.data,
      });
      setPrioritizeIncompleteTranslations(false);
      toast.success(t("published"));
      return true;
    } catch (error) {
      toast.error(commonT("publishError"), {
        description:
          error instanceof Error ? error.message : commonT("tryAgain"),
      });
      return false;
    }
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        viewport={["desktop", "mobile"]}
        titleAccessory={
          dirty ? (
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/5 text-primary"
            >
              {commonT("unpublishedChanges")}
            </Badge>
          ) : null
        }
      >
        <Button
          leftIcon={Plus}
          onClick={() =>
            openAwardForm({
              cars: publishedAwards.cars,
              classes: publishedAwards.classes,
              onSave: (value) => saveAward(undefined, value),
            })
          }
        >
          {t("addAward")}
        </Button>
        <Button
          variant="outline"
          leftIcon={RotateCcw}
          disabled={!dirty}
          onClick={() =>
            openConfirm({
              title: commonT("discardTitle"),
              description: commonT("discardDescription"),
              confirmLabel: commonT("discardChanges"),
              cancelLabel: commonT("keepEditing"),
              destructive: false,
              onConfirm: () => {
                setDraft({
                  items: publishedAwards.items,
                  content: publishedContent.data,
                });
                setPrioritizeIncompleteTranslations(false);
                toast.success(commonT("changesDiscarded"));
              },
            })
          }
        >
          {commonT("discardChanges")}
        </Button>
        <Button
          leftIcon={Upload}
          disabled={!dirty}
          onClick={() =>
            openPublish({
              title: commonT("publishTitle"),
              description: commonT("publishDescription"),
              keepEditingLabel: commonT("keepEditing"),
              publishLabel: commonT("publishChanges"),
              languageGap:
                incompleteTranslationCount > 0
                  ? {
                      title: t("missingLanguageTitle"),
                      description: t("missingLanguageDescription", {
                        count: incompleteTranslationCount,
                      }),
                      fixContentLabel: t("fixContent"),
                      publishAnywayLabel: t("publishAnyway"),
                      onFixContent: () =>
                        setPrioritizeIncompleteTranslations(true),
                    }
                  : undefined,
              onPublish: publish,
            })
          }
        >
          {commonT("publishChanges")}
        </Button>
      </PageHeader>
      <AwardDescriptionCard
        data={draft.content}
        dirty={contentDirty}
        editLabel={commonT("editDescription")}
        draftLabel={commonT("draft")}
        emptyLabel={commonT("noDescription")}
        onEdit={editDescription}
      />
      <Card className="overflow-hidden p-0">
        <ClientSideDraggableTable
          data={displayedItems}
          columns={columns}
          columnSorting={columnSorting}
          onColumnSortingChange={(updater) => {
            setPrioritizeIncompleteTranslations(false);
            setColumnSorting(updater);
          }}
          enabledRowSorting
          rowSortingDisabled={
            reviewingIncompleteTranslations || columnSorting.length > 0
          }
          enableColumnSorting
          canDragRow={(item) => !item.removed}
          getRowClassName={(item) => (item.removed ? "opacity-55" : undefined)}
          onReorder={onReorder}
          emptyRow={
            <div className="py-14 text-center text-sm text-muted-foreground">
              {t("empty")}
            </div>
          }
          className="max-h-none"
          tableClassName="min-w-[760px]"
        />
      </Card>
    </>
  );
}
