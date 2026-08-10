"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import Text from "@/src/components/ui/text";
import useAsync from "@/src/hooks/use-async";

export function ArchiveFinalizedCarsConfirmation({
  onConfirm,
}: {
  onConfirm: () => Promise<boolean>;
}) {
  const t = useTranslations("cars.finalized");
  const commonT = useTranslations("common");
  const modal = useModal();
  const { isLoading, execute } = useAsync(false);
  const [value, setValue] = useState("");
  const confirmed = value === "archive";

  async function handleConfirm() {
    if (!confirmed || isLoading) return;
    await execute(async () => {
      if (await onConfirm()) modal.close();
    });
  }

  return (
    <>
      <div className="space-y-2 p-4">
        <Text.FormTitle size="base">{t("archiveTitle")}</Text.FormTitle>
        <Text size="sm" color="muted-foreground">
          {t("archiveDescription")}
        </Text>
        <Text size="sm" color="muted-foreground" className="pt-2">
          {t.rich("archiveInstruction", {
            keyword: (chunks) => (
              <strong className="font-semibold text-foreground">{chunks}</strong>
            ),
          })}
        </Text>
        <Input
          aria-label={t("archiveInputAria")}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 border-t bg-muted/50 p-4">
        <Button variant="outline" disabled={isLoading} onClick={modal.close}>
          {commonT("cancel")}
        </Button>
        <Button
          loading={isLoading}
          disabled={isLoading || !confirmed}
          onClick={() => void handleConfirm()}
        >
          {t("archiveCars")}
        </Button>
      </div>
    </>
  );
}
