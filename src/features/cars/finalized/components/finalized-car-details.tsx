"use client";

import { Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { Tabs } from "@/src/components/ui/tabs";
import { downloadFinalizedCarForms } from "@/src/features/cars/finalized/finalized-car-download";
import { CarEntryFormReviewClient } from "@/src/features/cars/reservation/review/car-entry-form-review-client";
import { ReservationFormReviewClient } from "@/src/features/cars/reservation/review/reservation-review-client";
import { SubmissionReviewClient } from "@/src/features/cars/submission/review/submission-review-client";
import type {
  FinalizedCarDraft,
  FinalizedCarDraftStatus,
  FinalizedCarListItem,
} from "@/src/features/cars/finalized/finalized-cars.types";
import { formatDate } from "@/src/lib/date";
import { logger } from "@/src/lib/logger";
import type { Locale } from "@/src/types/locale";
import { romanNumeral } from "@/src/features/cars/submission/submission.types";

type ReviewTab = "basic" | "owner" | "car";

function isFinalizedCarDraftStatus(
  status: string,
): status is FinalizedCarDraftStatus {
  return status === "finalized" || status === "archived" || status === "rejected";
}

export function FinalizedCarDetails({
  car,
  draft,
  initialEditLocale,
  onClose,
  onDirtyChange,
  onStageDraft,
}: {
  car: FinalizedCarListItem;
  draft?: FinalizedCarDraft;
  initialEditLocale?: Locale;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onStageDraft: (draft: FinalizedCarDraft) => void;
}) {
  const t = useTranslations("cars.finalized");
  const commonT = useTranslations("common");
  const locale = useLocale() as Locale;
  const [activeTab, setActiveTab] = useState<ReviewTab>("basic");
  const carName = [car.make, car.model].filter(Boolean).join(" ");
  const ownerName = [car.ownerFirstName, car.ownerLastName]
    .filter(Boolean)
    .join(" ");
  const classLabel =
    car.classSequence === null
      ? t("unassigned")
      : `${t("classNumber", {
          number: romanNumeral(car.classSequence),
        })}${car.className ? ` — ${car.className}` : ""}`;

  async function handleDownload() {
    try {
      await downloadFinalizedCarForms(
        car.id,
        {
          make: car.make,
          model: car.model,
          ownerName,
          vehicleRef: car.vehicleRef,
        },
      );
    } catch (error) {
      logger.error("FINALIZED-CARS", "Failed to download finalized car form", {
        error: error instanceof Error ? error.message : String(error),
        submissionVehicleId: car.id,
      });
      toast.error(t("downloadError"), { description: t("tryAgain") });
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="relative px-5 pt-5 pr-16 pb-2">
        <h2 className="font-heading text-2xl">{carName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("submittedAndUpdated", {
            submitted: formatDate(car.createdAt, locale),
            updated: formatDate(car.updatedAt, locale),
          })}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={!car.carEntryFormId}
          title={
            !car.carEntryFormId ? t("carEntryFormUnavailable") : undefined
          }
          onClick={() => void handleDownload()}
        >
          <Download className="size-4" /> {t("downloadPdf")}
        </Button>
      </div>

      <div className="flex flex-1 flex-col px-5 py-5">
        <Tabs<ReviewTab>
          aria-label={t("reviewTabsAria")}
          value={activeTab}
          setValue={setActiveTab}
          tabs={[
            {
              value: "basic",
              label: t("basicInformation"),
              className: "pt-5",
              keepMounted: true,
              children: (
                <SubmissionReviewClient
                  carId={car.id}
                  embedded
                  initialEditLocale={initialEditLocale}
                  onClose={onClose}
                  onDirtyChange={onDirtyChange}
                  onStageDraft={(nextDraft) => {
                    if (!isFinalizedCarDraftStatus(nextDraft.stagedStatus)) {
                      throw new Error("The selected finalized car status is invalid.");
                    }
                    onStageDraft({
                      ...nextDraft,
                      stagedStatus: nextDraft.stagedStatus,
                    });
                  }}
                  stagedDraft={draft}
                  stagedLayout={{
                    classHint: t("classAssignmentHint"),
                    classLabel,
                    classTitle: t("class"),
                    internalCommentsDescription: t(
                      "internalCommentsDescription",
                    ),
                    statusOptions: [
                      { label: t("status.finalized"), value: "finalized" },
                      { label: t("status.archived"), value: "archived" },
                      { label: t("status.rejected"), value: "rejected" },
                    ],
                    statusTitle: t("statusLabel"),
                    statusValue: draft?.stagedStatus ?? car.status,
                  }}
                  readOnly={car.status === "archived"}
                />
              ),
            },
            {
              value: "owner",
              label: t("ownerRegistrationTab"),
              disabled: !car.ownerReservationId,
              title: !car.ownerReservationId
                ? t("ownerRegistrationUnavailable")
                : undefined,
              className: "pt-5",
              children: car.ownerReservationId ? (
                <ReservationFormReviewClient
                  ownerId={car.ownerReservationId}
                  embedded
                  readOnly
                />
              ) : null,
            },
            {
              value: "car",
              label: t("carEntryFormTab"),
              disabled: !car.carEntryFormId,
              title: !car.carEntryFormId
                ? t("carEntryFormUnavailable")
                : undefined,
              className: "pt-5",
              children: car.carEntryFormId ? (
                <CarEntryFormReviewClient carId={car.id} readOnly />
              ) : null,
            },
          ]}
        />
      </div>

      {activeTab !== "basic" ? (
        <div className="sticky bottom-0 flex justify-end border-t bg-background/95 px-5 py-4 backdrop-blur">
          <Button variant="outline" onClick={onClose}>
            {commonT("close")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
