"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Repeat, RotateCcw, Trash2, Trophy, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PageHeader } from "@/src/components/page-header";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import ClientSideDraggableTable from "@/src/components/ui/table/client-side-custom-table";
import { publishContentFieldAction } from "@/src/features/content-field/content-field.actions";
import { AwardDescriptionCard } from "../components/award-description-card";
import { AwardCarThumbnail } from "../components/award-car-thumbnail";
import { useAwardModals } from "../hooks/use-award-modals";
import { useAwardDraftStorage } from "../hooks/use-award-draft-storage";
import { publishBestOfShowAction } from "../awards.actions";
import {
  storedBestOfShowAwardDraft,
  type BestOfShowAwardDraft,
} from "../awards.schema";
import type {
  AwardCar,
  AwardClass,
  AwardPageInitialData,
  BestOfShowData,
} from "../awards.types";

const snapshot = (value: unknown) => JSON.stringify(value);
const BEST_OF_SHOW_DRAFT_STORAGE_KEY =
  "anantara-cms:awards:best-of-show:draft:v1";

type BestOfShowTableRow = {
  id: string;
  car: AwardCar;
  carClass: AwardClass | undefined;
};

export function BestOfShowClient({
  initialData,
}: {
  initialData: AwardPageInitialData<BestOfShowData>;
}) {
  const t = useTranslations("awards.bestOfShow");
  const commonT = useTranslations("awards.common");
  const [publishedAwards, setPublishedAwards] = useState(initialData.awards);
  const [publishedContent, setPublishedContent] = useState(initialData.content);
  const [draft, setDraft] = useState<BestOfShowAwardDraft>({
    entry: initialData.awards.entry,
    content: initialData.content.data,
  });
  const {
    openCarDetails,
    openCarPicker,
    openConfirm,
    openDescription,
    openPublish,
  } = useAwardModals();
  const contentDirty =
    snapshot(draft.content) !== snapshot(publishedContent.data);
  const dirty =
    snapshot(draft.entry) !== snapshot(publishedAwards.entry) || contentDirty;
  const winner = draft.entry.carId
    ? publishedAwards.cars.find((car) => car.id === draft.entry.carId)
    : undefined;
  const winnerClass =
    winner?.categoryId === null
      ? undefined
      : publishedAwards.classes.find((item) => item.id === winner?.categoryId);
  const winnerRows: BestOfShowTableRow[] = winner
    ? [{ id: winner.id, car: winner, carClass: winnerClass }]
    : [];
  const winnerColumns: ColumnDef<BestOfShowTableRow, unknown>[] = [
    {
      id: "image",
      header: commonT("image"),
      cell: ({ row }) => <AwardCarThumbnail car={row.original.car} />,
    },
    {
      id: "class",
      header: commonT("class"),
      cell: ({ row }) => (
        <div>
          <span className="block font-medium">
            {row.original.carClass
              ? t("classNumber", { number: row.original.carClass.sequence })
              : "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.carClass?.name}
          </span>
        </div>
      ),
    },
    {
      id: "carName",
      header: commonT("carName"),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.car.name}</span>
      ),
    },
    {
      id: "year",
      header: commonT("year"),
      cell: ({ row }) => row.original.car.year,
    },
    {
      id: "owner",
      header: commonT("owner"),
      cell: ({ row }) => row.original.car.owner,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={Repeat}
            onClick={openPicker}
          >
            {t("changeWinner")}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={commonT("viewDetails")}
            onClick={() => void openCarDetails(row.original.car)}
          >
            <Eye />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("removeWinner")}
            onClick={() =>
              openConfirm({
                title: t("removeWinnerTitle"),
                description: t("removeWinnerDescription"),
                confirmLabel: commonT("remove"),
                cancelLabel: commonT("cancel"),
                destructive: true,
                onConfirm: () => {
                  setDraft((current) => ({
                    ...current,
                    entry: { ...current.entry, carId: null },
                  }));
                  toast.success(t("winnerRemoved"), {
                    description: commonT("rememberToPublish"),
                  });
                },
              })
            }
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  useAwardDraftStorage({
    data: draft,
    dirty,
    parse: storedBestOfShowAwardDraft,
    setData: setDraft,
    storageKey: BEST_OF_SHOW_DRAFT_STORAGE_KEY,
  });

  function openDescriptionEditor() {
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

  function openPicker() {
    openCarPicker({
      cars: publishedAwards.cars,
      classes: publishedAwards.classes,
      currentCarId: draft.entry.carId,
      title: t("selectWinnerTitle"),
      description: t("pickerDescription"),
      onSelect: (carId) => {
        setDraft((current) => ({
          ...current,
          entry: { ...current.entry, carId },
        }));
        toast.success(t("winnerUpdated"), {
          description: commonT("rememberToPublish"),
        });
      },
    });
  }

  async function publish() {
    try {
      const [canonicalAwards, canonicalContent] = await Promise.all([
        publishBestOfShowAction({ entry: draft.entry }),
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
        entry: canonicalAwards.entry,
        content: canonicalContent.data,
      });
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
          variant="outline"
          leftIcon={RotateCcw}
          disabled={!dirty}
          onClick={() =>
            openConfirm({
              title: commonT("discardTitle"),
              description: commonT("discardDescription"),
              confirmLabel: commonT("discardChanges"),
              cancelLabel: commonT("keepEditing"),
              destructive: true,
              onConfirm: () => {
                setDraft({
                  entry: publishedAwards.entry,
                  content: publishedContent.data,
                });
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
        onEdit={openDescriptionEditor}
      />
      {winner ? (
        <Card className="overflow-hidden p-0">
          <ClientSideDraggableTable
            data={winnerRows}
            columns={winnerColumns}
            onReorder={() => {}}
            tableClassName="min-w-[760px] text-sm"
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Trophy
                className="size-5 text-muted-foreground"
                strokeWidth={1.5}
              />
            </div>
            <p className="font-heading text-lg">{t("emptyTitle")}</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {t("emptyDescription")}
            </p>
            <Button leftIcon={Trophy} onClick={openPicker}>
              {t("selectWinner")}
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
