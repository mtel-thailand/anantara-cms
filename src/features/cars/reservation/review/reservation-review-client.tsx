"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import NavigationButton from "@/src/components/navigation-button";
import { PageHeader } from "@/src/components/page-header";
import { useModal } from "@/src/components/providers/modal-provider";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import Text from "@/src/components/ui/text";
import useAsync from "@/src/hooks/use-async";
import { useRouter } from "@/src/i18n/navigation";
import { logger } from "@/src/lib/logger";
import { cn } from "@/src/lib/utils";
import {
  FORM_STATUS_BADGE,
} from "@/src/features/cars/reservation/list/components/form-status-stepper";
import { downloadOwnerReservation } from "@/src/features/cars/reservation/list/owner-reservation-download";
import {
  getOwnerReservation,
  markOwnerReservationSeen,
} from "@/src/features/cars/reservation/list/owner-reservation-list.service";
import type { OwnerReservationDetail } from "@/src/features/cars/reservation/list/owner-reservation-list.types";
import { updateOwnerReservationApprovalAction } from "@/src/features/cars/reservation/review/reservation-review.actions";
import { OwnerRegistrationView } from "@/src/features/cars/reservation/review/components/owner-registration-view";

function ownerName(reservation: OwnerReservationDetail) {
  return [reservation.owner_forenames, reservation.owner_surname]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
}

export function ReservationFormReviewClient({
  embedded = false,
  ownerId,
}: {
  embedded?: boolean;
  ownerId: string;
}) {
  const t = useTranslations("cars.reservation.review");
  const listT = useTranslations("cars.reservation.list");
  const commonT = useTranslations("common");
  const router = useRouter();
  const modal = useModal();
  const { isLoading, execute } = useAsync(true);
  const { isLoading: isSaving, execute: executeSave } = useAsync();
  const [reservation, setReservation] = useState<OwnerReservationDetail | null>(
    null,
  );
  const loadReservation = useCallback(async () => {
    try {
      await markOwnerReservationSeen(ownerId);
      const data = await getOwnerReservation(ownerId);
      setReservation({ ...data, seen: true });
    } catch (error) {
      logger.error("OWNER-RESERVATIONS", "Failed to load owner registration", {
        error: error instanceof Error ? error.message : String(error),
        reservationId: ownerId,
      });
      setReservation(null);
    }
  }, [ownerId]);

  useEffect(() => {
    void execute(loadReservation);
  }, [execute, loadReservation]);

  async function changeApproval(action: "approve" | "undo") {
    if (!reservation) return;

    try {
      const notification = await executeSave(
        updateOwnerReservationApprovalAction,
        {
          action,
          expectedUpdatedAt: reservation.updated_at,
          id: reservation.id,
        },
      );
      const saved = await getOwnerReservation(reservation.id);
      setReservation(saved);
      modal.close();
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
          action === "approve" ? t("approved") : t("approvalUndone"),
          {
            description:
              action === "approve"
                ? t("approvedDescription", {
                    name: ownerName(reservation) || t("unknownOwner"),
                  })
                : t("undoDescription", {
                    name: ownerName(reservation) || t("unknownOwner"),
                  }),
          },
        );
      }
    } catch (error) {
      logger.error("OWNER-RESERVATIONS", "Failed to update approval", {
        action,
        error: error instanceof Error ? error.message : String(error),
        reservationId: reservation.id,
      });
      toast.error(t("saveError"), {
        description: error instanceof Error ? error.message : t("tryAgain"),
      });
    }
  }

  function requestApprovalChange(action: "approve" | "undo") {
    modal.preventBackdropClose();
    modal.open({
      headerClassName: "border-0 px-4 py-0 pt-4",
      header: (
        <div className="pr-8">
          <Text.FormTitle size="xl">
            {action === "approve" ? t("approveTitle") : t("undoTitle")}
          </Text.FormTitle>
          <Text size="sm" color="muted-foreground" className="mt-1">
            {action === "approve" ? t("approveDescription") : t("undoWarning")}
          </Text>
        </div>
      ),
      footer: ({ loading, run }) => (
        <>
          <Button variant="outline" onClick={modal.close}>
            {commonT("cancel")}
          </Button>
          <Button
            variant={action === "undo" ? "secondary" : "default"}
            loading={loading}
            onClick={() => void run(() => changeApproval(action))}
          >
            {action === "approve" ? t("approve") : t("undoApproval")}
          </Button>
        </>
      ),
    });
  }

  const backHref = reservation?.deletedAt
    ? "/app/cars/forms/deleted"
    : "/app/cars/forms";
  const backLabel = reservation?.deletedAt ? t("backDeleted") : t("back");

  if (isLoading) {
    return (
      <>
        {!embedded ? <NavigationButton
          text={t("back")}
          onClick={() => router.push("/app/cars/forms")}
        /> : null}
        <Card className="flex h-48 items-center justify-center text-sm text-muted-foreground shadow-none">
          {t("loading")}
        </Card>
      </>
    );
  }

  if (!reservation) {
    return (
      <>
        {!embedded ? <NavigationButton
          text={t("back")}
          onClick={() => router.push("/app/cars/forms")}
        /> : null}
        <Card className="flex h-48 items-center justify-center text-sm text-muted-foreground shadow-none">
          {t("notFound")}
        </Card>
      </>
    );
  }

  const name = ownerName(reservation);
  const returned =
    reservation.status === "received" || reservation.status === "approved";
  const readOnly = reservation.deletedAt !== null;
  const carDescription = reservation.carNames.length
    ? t("description", {
        count: reservation.carNames.length,
        email: reservation.owner_email ?? "",
        names: reservation.carNames.join(", "),
      })
    : t("descriptionNoCars", { email: reservation.owner_email ?? "" });
  return (
    <>
      {!embedded ? <NavigationButton
        text={backLabel}
        onClick={() => router.push(backHref)}
      /> : null}
      {!embedded ? <PageHeader
        title={name || reservation.owner_email || t("unknownOwner")}
        description={carDescription}
        titleAccessory={
          <Badge
            variant="outline"
            className={cn(FORM_STATUS_BADGE[reservation.status])}
          >
            {listT(`status.${reservation.status}`)}
          </Badge>
        }
      >
        <Button
          variant="outline"
          disabled={readOnly || !returned}
          title={!returned && !readOnly ? t("downloadDisabled") : undefined}
          onClick={() => downloadOwnerReservation(reservation)}
        >
          <Download className="size-4" /> {t("downloadCsv")}
        </Button>
      </PageHeader> : null}

      <Card className="flex flex-col gap-6 p-5 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold">{t("ownerRegistration")}</h2>
            <Badge
              variant="outline"
              className={cn(FORM_STATUS_BADGE[reservation.status])}
            >
              {listT(`status.${reservation.status}`)}
            </Badge>
          </div>
        </div>
        <p className="-mt-4 text-xs text-muted-foreground">
          {t("readOnlyDescription")}
          {!returned ? ` ${t("approvalUnavailable")}` : ""}
        </p>
        <OwnerRegistrationView reservation={reservation} />
      </Card>

      {!readOnly ? (
        <div className="sticky bottom-0 z-20 mt-6 border-t bg-background/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-end gap-2 py-4">
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => router.push(backHref)}
            >
              {commonT("cancel")}
            </Button>
            {reservation.status === "approved" ? (
              <Button
                variant="outline"
                disabled={isSaving}
                onClick={() => requestApprovalChange("undo")}
              >
                {t("undoApproval")}
              </Button>
            ) : (
              <Button
                disabled={isSaving || reservation.status !== "received"}
                onClick={() => requestApprovalChange("approve")}
              >
                {t("approve")}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
