"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import ControlledInput from "@/src/components/form/input";
import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import Text from "@/src/components/ui/text";
import {
  carClassFormSchema,
  type CarClassFormValues,
} from "@/src/features/cars/classes/car-classes.schema";
import type { CarClass } from "@/src/features/cars/classes/car-classes.types";

export function CarClassFormModal({
  carClass,
  position,
  onDelete,
  onSave,
}: {
  carClass?: CarClass;
  position: number;
  onDelete?: () => void;
  onSave: (name: string) => string | null;
}) {
  const modal = useModal();
  const t = useTranslations("cars.classes");
  const commonT = useTranslations("common");
  const form = useForm<CarClassFormValues>({
    resolver: zodResolver(carClassFormSchema),
    defaultValues: { name: carClass?.name ?? "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const submit = form.handleSubmit(({ name }) => {
    const error = onSave(name);
    if (error) {
      form.setError("name", { message: error });
      return;
    }
    modal.close();
  });

  return (
    <form className="space-y-5 p-4" onSubmit={submit}>
      <div>
        <Text.FormTitle size="base" weight="medium">
          {carClass
            ? t("editClassNumber", { number: position })
            : t("addClassNumber", { number: position })}
        </Text.FormTitle>
        <Text className="mt-1" size="sm" color="muted-foreground">
          {carClass ? t("editClassDescription") : t("addClassDescription")}
        </Text>
      </div>

      <ControlledInput
        control={form.control}
        name="name"
        label={t("className")}
        htmlFor="car-class-name"
        id="car-class-name"
        autoFocus
        placeholder={t("classNamePlaceholder")}
        required
        error={{
          hasError: Boolean(form.formState.errors.name),
          message: form.formState.errors.name?.message,
        }}
      />

      <div className="-mx-4 -mb-4 flex justify-between gap-2 border-t bg-muted/40 px-4 py-4">
        {carClass && onDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            leftIcon={Trash2}
            onClick={onDelete}
          >
            {t("delete")}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={modal.close}>
            {commonT("cancel")}
          </Button>
          <Button type="submit">
            {carClass ? commonT("saveChanges") : t("addClass")}
          </Button>
        </div>
      </div>
    </form>
  );
}
