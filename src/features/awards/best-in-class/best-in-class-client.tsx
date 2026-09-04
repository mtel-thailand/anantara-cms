"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Plus, Repeat, RotateCcw, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PageHeader } from "@/src/components/page-header";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { PrivateCollectionWarning } from "@/src/components/ui/private-collection-warning";
import ClientSideDraggableTable from "@/src/components/ui/table/client-side-custom-table";
import { publishContentFieldAction } from "@/src/features/content-field/content-field.actions";
import { romanNumeral } from "@/src/features/cars/car-class-number.helpers";
import { AwardDescriptionCard } from "../components/award-description-card";
import { AwardCarThumbnail } from "../components/award-car-thumbnail";
import { useAwardModals } from "../hooks/use-award-modals";
import { useAwardDraftStorage } from "../hooks/use-award-draft-storage";
import { publishBestInClassAction } from "../awards.actions";
import {
  storedBestInClassAwardDraft,
  type BestInClassAwardDraft,
} from "../awards.schema";
import type {
  AwardCar,
  AwardPageInitialData,
  BestInClassData,
  BestInClassEntry,
  BestInClassRole,
} from "../awards.types";

const ROLES: BestInClassRole[] = ["winner", "runnerUp"];
const BEST_IN_CLASS_DRAFT_STORAGE_KEY =
  "anantara-cms:awards:best-in-class:draft:v1";

type BestInClassTableRow = {
  id: BestInClassRole;
  car: AwardCar | undefined;
  entry: BestInClassEntry;
  role: BestInClassRole;
};

function snapshot(value: unknown) {
  return JSON.stringify(value);
}

export function BestInClassClient({
  initialData,
}: {
  initialData: AwardPageInitialData<BestInClassData>;
}) {
  const t = useTranslations("awards.bestInClass");
  const commonT = useTranslations("awards.common");
  const privacyT = useTranslations("cars.finalized");
  const [publishedAwards, setPublishedAwards] = useState(initialData.awards);
  const [publishedContent, setPublishedContent] = useState(initialData.content);
  const [draft, setDraft] = useState<BestInClassAwardDraft>({
    entries: initialData.awards.entries,
    content: initialData.content.data,
  });
  const {
    openCarDetails,
    openCarPicker,
    openConfirm,
    openDescription,
    openPublish,
  } = useAwardModals();

  const normalizedEntries = useMemo(
    () =>
      publishedAwards.classes.flatMap((carClass) =>
        ROLES.map(
          (role): BestInClassEntry =>
            draft.entries.find(
              (entry) =>
                entry.categoryId === carClass.id && entry.role === role,
            ) ?? { id: null, carId: null, categoryId: carClass.id, role },
        ),
      ),
    [draft.entries, publishedAwards.classes],
  );
  const dirty =
    snapshot(normalizedEntries) !==
      snapshot(
        publishedAwards.classes.flatMap((carClass) =>
          ROLES.map(
            (role): BestInClassEntry =>
              publishedAwards.entries.find(
                (entry) =>
                  entry.categoryId === carClass.id && entry.role === role,
              ) ?? { id: null, carId: null, categoryId: carClass.id, role },
          ),
        ),
      ) || snapshot(draft.content) !== snapshot(publishedContent.data);
  const contentDirty =
    snapshot(draft.content) !== snapshot(publishedContent.data);
  const carById = new Map(publishedAwards.cars.map((car) => [car.id, car]));

  useAwardDraftStorage({
    data: draft,
    dirty,
    parse: storedBestInClassAwardDraft,
    setData: setDraft,
    storageKey: BEST_IN_CLASS_DRAFT_STORAGE_KEY,
  });

  function updateEntry(
    categoryId: number,
    role: BestInClassRole,
    carId: string | null,
  ) {
    setDraft((current) => {
      const existing = current.entries.find(
        (entry) => entry.categoryId === categoryId && entry.role === role,
      );
      const entries = existing
        ? current.entries.map((entry) =>
            entry === existing ? { ...entry, carId } : entry,
          )
        : [...current.entries, { id: null, carId, categoryId, role }];
      return { ...current, entries };
    });
  }

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

  async function publish() {
    try {
      const entriesToPublish = normalizedEntries.filter(
        (entry) => entry.carId !== null,
      );
      const [canonicalAwards, canonicalContent] = await Promise.all([
        publishBestInClassAction({ entries: entriesToPublish }),
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
        entries: canonicalAwards.entries,
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
              destructive: false,
              onConfirm: () => {
                setDraft({
                  entries: publishedAwards.entries,
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

      {publishedAwards.classes.length === 0 ? (
        <Card className="px-6 py-16 text-center text-sm text-muted-foreground">
          {t("noClasses")}
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {publishedAwards.classes.map((carClass, index) =>
            (() => {
              const rows: BestInClassTableRow[] = ROLES.map((role) => {
                const entry = normalizedEntries.find(
                  (item) =>
                    item.categoryId === carClass.id && item.role === role,
                )!;
                return {
                  id: role,
                  car: entry.carId ? carById.get(entry.carId) : undefined,
                  entry,
                  role,
                };
              });
              const columns: ColumnDef<BestInClassTableRow, unknown>[] = [
                {
                  accessorKey: "role",
                  header: t("entry"),
                  enableSorting: false,
                  size: 110,
                  cell: ({ row }) => (
                    <span className="font-medium text-muted-foreground">
                      {t(row.original.role)}
                    </span>
                  ),
                },
                {
                  id: "image",
                  header: commonT("image"),
                  enableSorting: false,
                  size: 90,
                  cell: ({ row }) => {
                    const car = row.original.car;
                    return car ? (
                      <AwardCarThumbnail
                        car={car}
                        ariaLabel={commonT("viewDetails")}
                        onClick={() => void openCarDetails(car)}
                      />
                    ) : (
                      <span className="text-muted-foreground whitespace-nowrap overflow-visible">
                        {t("noRoleAssigned", {
                          role: t(row.original.role).toLocaleLowerCase(),
                        })}
                      </span>
                    );
                  },
                },
                {
                  id: "carName",
                  header: commonT("carName"),
                  enableSorting: false,
                  size: 240,
                  cell: ({ row }) =>
                    row.original.car ? (
                      <span className="font-medium">
                        {row.original.car.name}
                      </span>
                    ) : null,
                },
                {
                  id: "year",
                  header: commonT("year"),
                  enableSorting: false,
                  size: 60,
                  cell: ({ row }) => row.original.car?.year,
                },
                {
                  id: "owner",
                  header: commonT("owner"),
                  enableSorting: false,
                  size: 110,
                  cell: ({ row }) =>
                    row.original.car ? (
                      <div className="flex flex-col gap-0.5">
                        <span>{row.original.car.owner}</span>
                        {row.original.car.hideOwnerName ? (
                          <PrivateCollectionWarning
                            label={privacyT("privateCollection")}
                            hint={privacyT("privateCollectionHint")}
                          />
                        ) : null}
                      </div>
                    ) : null,
                },
                {
                  id: "actions",
                  header: "",
                  enableSorting: false,
                  size: 280,
                  cell: ({ row }) => {
                    const { car, entry, role } = row.original;
                    const roleLabel = t(role);
                    const otherRole = role === "winner" ? "runnerUp" : "winner";
                    const excludedCarId = normalizedEntries.find(
                      (item) =>
                        item.categoryId === carClass.id &&
                        item.role === otherRole,
                    )?.carId;
                    const pick = () =>
                      openCarPicker({
                        cars: publishedAwards.cars,
                        classes: publishedAwards.classes,
                        currentCarId: entry.carId,
                        excludedCarId,
                        lockedClassId: carClass.id,
                        title: t("selectRole", {
                          role: roleLabel.toLocaleLowerCase(),
                        }),
                        description: t("pickerDescription"),
                        onSelect: (carId) => {
                          updateEntry(carClass.id, role, carId);
                          toast.success(t("entryUpdated"), {
                            description: commonT("rememberToPublish"),
                          });
                        },
                      });

                    return (
                      <div className="flex justify-end gap-2">
                        {car ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={Repeat}
                              onClick={pick}
                            >
                              {t("changeEntry")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={commonT("viewDetails")}
                              onClick={() => void openCarDetails(car)}
                            >
                              <Eye className="size-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("removeEntry")}
                              onClick={() =>
                                openConfirm({
                                  title: t("removeRoleTitle", {
                                    role: roleLabel.toLocaleLowerCase(),
                                  }),
                                  description: t("removeRoleDescription"),
                                  confirmLabel: commonT("remove"),
                                  cancelLabel: commonT("cancel"),
                                  destructive: true,
                                  onConfirm: () => {
                                    updateEntry(carClass.id, role, null);
                                    toast.success(t("entryRemoved"), {
                                      description: commonT("rememberToPublish"),
                                    });
                                  },
                                })
                              }
                            >
                              <Trash2 className="size-4 text-muted-foreground" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={Plus}
                            onClick={pick}
                          >
                            {t("addRole", {
                              role: roleLabel.toLocaleLowerCase(),
                            })}
                          </Button>
                        )}
                      </div>
                    );
                  },
                },
              ];

              return (
                <Card key={carClass.id} className="overflow-hidden p-0">
                  <div className="flex items-baseline gap-2.5 border-b px-5 py-3">
                    <span className="font-medium text-muted-foreground">
                      {t("classNumber", { number: romanNumeral(index + 1) })}
                    </span>
                    <span className="font-heading text-lg">
                      {carClass.name}
                    </span>
                  </div>
                  <ClientSideDraggableTable
                    data={rows}
                    columns={columns}
                    onReorder={() => {}}
                    headerClassName="px-5"
                    tableClassName="w-full table-fixed text-sm"
                    respectColumnSizes
                  />
                </Card>
              );
            })(),
          )}
        </div>
      )}
    </>
  );
}
