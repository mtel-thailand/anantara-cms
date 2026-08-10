"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import Text from "@/src/components/ui/text";
import useAsync from "@/src/hooks/use-async";
import { useRouter } from "@/src/i18n/navigation";
import { logger } from "@/src/lib/logger";
import { FORM_STATUS_BADGE } from "@/src/features/cars/reservation/list/components/form-status-stepper";
import { cn } from "@/src/lib/utils";
import { updateCarEntryFormApprovalAction } from "@/src/features/cars/reservation/review/car-entry-form-review.actions";
import { CarEntryFormView } from "@/src/features/cars/reservation/review/components/car-entry-form-view";
import {
  getCarEntryFormReview,
  markCarEntryFormSeen,
} from "@/src/features/cars/reservation/review/car-entry-form-review.service";
import type { CarEntryFormReviewDetail } from "@/src/features/cars/reservation/review/car-entry-form-review.types";

export function CarEntryFormReviewClient({
  carId,
  readOnly = false,
}: {
  carId: string;
  readOnly?: boolean;
}) {
  const t = useTranslations("cars.reservation.carReview");
  const listT = useTranslations("cars.reservation.list");
  const commonT = useTranslations("common");
  const router = useRouter();
  const modal = useModal();
  const { isLoading, execute } = useAsync(true);
  const [detail, setDetail] = useState<CarEntryFormReviewDetail | null>(null);

  const load = useCallback(async () => {
    const next = await execute(() => getCarEntryFormReview(carId));
    setDetail(next);
  }, [carId, execute]);

  useEffect(() => {
    void load().catch((error) => {
      logger.error("CAR-ENTRY-FORMS", "Failed to load car entry form", {
        carId,
        error: error instanceof Error ? error.message : String(error),
      });
      setDetail(null);
    });
    void markCarEntryFormSeen(carId).catch((error) => {
      logger.warn("CAR-ENTRY-FORMS", "Failed to mark car entry form seen", {
        carId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, [carId, load]);

  if (isLoading)
    return (
      <Card className="flex h-48 items-center justify-center shadow-none text-sm text-muted-foreground">
        {t("loading")}
      </Card>
    );
  if (!detail)
    return (
      <Card className="flex h-48 items-center justify-center shadow-none">
        {t("notFound")}
      </Card>
    );

  const status = detail.form.status;
  const isDeleted = detail.form.deleted_at !== null;
  const backHref = isDeleted
    ? "/app/cars/forms/deleted?tab=car"
    : "/app/cars/forms?tab=car";

  function requestApproval(action: "approve" | "undo") {
    if (!detail?.form) return;
    modal.open({
      headerClassName: "border-0 px-4 py-0 pt-4",
      header: (
        <Text.FormTitle size="base">
          {t(action === "approve" ? "approveTitle" : "undoTitle")}
        </Text.FormTitle>
      ),
      contentClassName: "px-4",
      content: (
        <Text size="sm" color="muted-foreground">
          {t(action === "approve" ? "approveDescription" : "undoDescription")}
        </Text>
      ),
      footer: ({ loading, close, run }) => (
        <>
          <Button variant="outline" disabled={loading} onClick={close}>
            {commonT("cancel")}
          </Button>
          <Button
            loading={loading}
            variant={action === "approve" ? "default" : "ghost"}
            onClick={() =>
              void run(async () => {
                try {
                  const notification = await updateCarEntryFormApprovalAction({
                    action,
                    expectedUpdatedAt: detail.form!.updated_at,
                    submissionVehicleId: carId,
                  });
                  await load();
                  close();
                  if (
                    action === "approve" &&
                    notification.emailAttempted &&
                    !notification.emailSent
                  ) {
                    toast.warning(t("approvedEmailFailed"), {
                      description: t("approvedEmailFailedDescription"),
                    });
                  } else {
                    toast.success(
                      t(action === "approve" ? "approved" : "approvalUndone"),
                    );
                  }
                } catch (error) {
                  logger.error(
                    "CAR-ENTRY-FORMS",
                    "Failed to update car entry form approval",
                    {
                      action,
                      carId,
                      error:
                        error instanceof Error ? error.message : String(error),
                    },
                  );
                  toast.error(t("saveError"), {
                    description: t("tryAgain"),
                  });
                }
              })
            }
          >
            {t(action === "approve" ? "approve" : "undoApproval")}
          </Button>
        </>
      ),
    });
  }

  return (
    <>
      <Card className="flex flex-col gap-6 p-5 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold">{t("carEntryFormTitle")}</h2>
            <Badge variant="outline" className={cn(FORM_STATUS_BADGE[status])}>
              {listT(`status.${status}`)}
            </Badge>
          </div>
        </div>
        <p className="-mt-4 text-xs text-muted-foreground">
          {t("readOnlyDescription")}
          {status !== "received" && status !== "approved"
            ? ` ${t("approvalUnavailable")}`
            : ""}
        </p>
        <CarEntryFormView detail={detail} />
      </Card>
      {!readOnly ? (
        <div className="sticky bottom-0 z-20 mt-6 flex justify-end gap-2 border-t bg-background/95 py-4 backdrop-blur">
          <Button variant="outline" onClick={() => router.push(backHref)}>
            {commonT("cancel")}
          </Button>
          {!isDeleted ? (
            status === "approved" ? (
              <Button variant="outline" onClick={() => requestApproval("undo")}>
                {t("undoApproval")}
              </Button>
            ) : (
              <Button
                disabled={status !== "received"}
                title={
                  status !== "received" ? t("approvalUnavailable") : undefined
                }
                onClick={() => requestApproval("approve")}
              >
                {t("approve")}
              </Button>
            )
          ) : null}
        </div>
      ) : null}
    </>
  );
}
