"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import NavigationButton from "@/src/components/navigation-button";
import { PageHeader } from "@/src/components/page-header";
import { Badge } from "@/src/components/ui/badge";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Tabs } from "@/src/components/ui/tabs";
import { useRouter } from "@/src/i18n/navigation";
import { formatDate } from "@/src/lib/date";
import { logger } from "@/src/lib/logger";
import { cn } from "@/src/lib/utils";
import type { Locale } from "@/src/types/locale";
import useAsync from "@/src/hooks/use-async";
import { FORM_STATUS_BADGE } from "@/src/features/cars/reservation/list/components/form-status-stepper";
import { ReservationFormReviewClient } from "@/src/features/cars/reservation/review/reservation-review-client";
import { CarEntryFormReviewClient } from "@/src/features/cars/reservation/review/car-entry-form-review-client";
import {
  getCarEntryFormReview,
  getCarFormsReviewShell,
} from "@/src/features/cars/reservation/review/car-entry-form-review.service";
import type { CarFormsReviewShell } from "@/src/features/cars/reservation/review/car-entry-form-review.types";
import { downloadCarEntryForm } from "@/src/features/cars/reservation/review/car-entry-form-download";
import { SubmissionReviewClient } from "@/src/features/cars/submission/review/submission-review-client";

type ReviewTab = "basic" | "owner" | "car";

export function CarFormsReviewClient({ carId }: { carId: string }) {
  const t = useTranslations("cars.reservation.carReview");
  const listT = useTranslations("cars.reservation.list");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { isLoading, execute } = useAsync(true);
  const [activeTab, setActiveTab] = useState<ReviewTab>("car");
  const [detail, setDetail] = useState<CarFormsReviewShell | null>(null);

  const load = useCallback(async () => {
    try {
      setDetail(await execute(() => getCarFormsReviewShell(carId)));
    } catch (error) {
      logger.error("CAR-FORMS-REVIEW", "Failed to load review shell", {
        carId,
        error: error instanceof Error ? error.message : String(error),
      });
      setDetail(null);
    }
  }, [carId, execute]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <Card className="flex h-48 items-center justify-center text-sm text-muted-foreground shadow-none">
        {t("loading")}
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card className="flex h-48 items-center justify-center text-sm text-muted-foreground shadow-none">
        {t("notFound")}
      </Card>
    );
  }

  const isDeleted = detail.vehicle.deletedAt !== null;
  const vehicle = detail.vehicle;
  const status = detail.form?.status ?? "required";
  const vehicleName = [vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ");
  const backHref = isDeleted
    ? "/app/cars/forms/deleted?tab=car"
    : "/app/cars/forms?tab=car";
  const canDownload = status === "received" || status === "approved";

  async function handleDownload() {
    try {
      await downloadCarEntryForm(await getCarEntryFormReview(carId), {
        make: vehicle.make,
        model: vehicle.model,
        vehicleRef: vehicle.vehicleRef,
      });
    } catch (error) {
      logger.error("CAR-FORMS-REVIEW", "Failed to download car entry form", {
        carId,
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error(t("downloadError"), { description: t("tryAgain") });
    }
  }

  return (
    <>
      <NavigationButton
        text={t(isDeleted ? "backDeleted" : "back")}
        onClick={() => router.push(backHref)}
      />
      <PageHeader
        title={vehicleName}
        description={`${detail.vehicle.vehicleRef} · ${t("submitted", {
          date: formatDate(detail.vehicle.createdAt, locale),
        })} · ${t("updated", {
          date: formatDate(
            detail.form?.updated_at ?? detail.vehicle.updatedAt,
            locale,
          ),
        })}`}
        titleAccessory={
          <Badge variant="outline" className={cn(FORM_STATUS_BADGE[status])}>
            {listT(`status.${status}`)}
          </Badge>
        }
      >
        <Button
          variant="outline"
          disabled={!canDownload}
          title={!canDownload ? t("downloadDisabled") : undefined}
          onClick={() => void handleDownload()}
        >
          <Download className="size-4" /> {t("downloadPdf")}
        </Button>
      </PageHeader>

      <Tabs<ReviewTab>
        aria-label={t("reviewTabsAria")}
        value={activeTab}
        setValue={setActiveTab}
        tabs={[
          {
            value: "basic",
            label: t("basicInformation"),
            className: "pt-6",
            children: <SubmissionReviewClient carId={carId} embedded />,
          },
          {
            value: "owner",
            label: t("ownerRegistrationTab"),
            disabled: !detail.ownerReservationId,
            title: !detail.ownerReservationId
              ? t("ownerRegistrationUnavailable")
              : undefined,
            className: "pt-6",
            children: detail.ownerReservationId ? (
              <ReservationFormReviewClient
                ownerId={detail.ownerReservationId}
                embedded
              />
            ) : null,
          },
          {
            value: "car",
            label: t("carEntryFormTab"),
            className: "pt-6",
            children: <CarEntryFormReviewClient carId={carId} />,
          },
        ]}
      />
    </>
  );
}
