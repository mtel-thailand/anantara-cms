"use client";

import {
  useCallback,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Car as CarIcon, ImageUp, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { FormLanguageToggle } from "@/src/components/form/language-toggle";
import ControlledInput from "@/src/components/form/input";
import ControlledTextarea from "@/src/components/form/textarea";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Label } from "@/src/components/ui/label";
import { PrivateCollectionWarning } from "@/src/components/ui/private-collection-warning";
import type { Locale } from "@/src/types/locale";
import { cn } from "@/src/lib/utils";
import { AwardCarThumbnail } from "../../components/award-car-thumbnail";
import { AwardCarPicker } from "../../components/award-car-picker";
import {
  carAwardFormSchema,
  notableFigureAwardFormSchema,
  type SpecialAwardFormValues,
} from "../../awards.schema";
import type {
  AwardCar,
  AwardClass,
  SpecialAwardItem,
} from "../../awards.types";
import {
  removeSpecialAwardPortrait,
  uploadSpecialAwardPortrait,
} from "../special-awards-media.service";
import BlankPerson from "@/public/images/awards/person.png";

export type SpecialAwardFormHandle = {
  save: () =>
    | (SpecialAwardFormValues & { kind: SpecialAwardItem["kind"] })
    | null;
};

const validationFields = [
  "title",
  "titleIt",
  "carId",
  "personName",
  "description",
  "descriptionIt",
  "imageUrl",
] as const;

function trimContent(value: string) {
  return value.trim();
}

type SpecialAwardFormLabels = {
  awardType: string;
  carAward: string;
  notableFigure: string;
  typeLocked: string;
  awardTitle: string;
  titlePlaceholderEn: string;
  titlePlaceholderIt: string;
  car: string;
  selectCar: string;
  changeCar: string;
  selectCarTitle: string;
  pickerDescription: string;
  personName: string;
  description: string;
  portrait: string;
  uploadImage: string;
  removeImage: string;
  imagePlaceholder: string;
};

export const SpecialAwardForm = forwardRef<
  SpecialAwardFormHandle,
  {
    editing?: SpecialAwardItem;
    cars: AwardCar[];
    classes: AwardClass[];
    labels: SpecialAwardFormLabels;
    onCanSaveChange: (canSave: boolean) => void;
  }
>(({ editing, cars, classes, labels, onCanSaveChange }, ref) => {
  const privacyT = useTranslations("cars.finalized");
  const [kind, setKind] = useState<SpecialAwardItem["kind"]>(
    editing?.kind ?? "car",
  );
  const [editingLanguage, setEditingLanguage] = useState<Locale>("en");
  const [selectingCar, setSelectingCar] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeUploadRef = useRef<AbortController | null>(null);
  const uploadedPortraitKeyRef = useRef<string | null>(null);
  const preserveUploadedPortraitRef = useRef(false);
  const unmountedRef = useRef(false);
  const validationAttemptedRef = useRef(false);
  const awardFormResolver = useCallback<Resolver<SpecialAwardFormValues>>(
    (values, context, options) =>
      zodResolver(
        kind === "car" ? carAwardFormSchema : notableFigureAwardFormSchema,
      )(values, context, options),
    [kind],
  );
  const form = useForm<SpecialAwardFormValues>({
    defaultValues: {
      title: editing?.title ?? "",
      titleIt: editing?.titleIt ?? "",
      carId: editing?.carId ?? null,
      personName: editing?.personName ?? "",
      description: editing?.description ?? "",
      descriptionIt: editing?.descriptionIt ?? "",
      imageUrl: editing?.imageUrl ?? "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver: awardFormResolver,
  });
  const selectedCarId = form.watch("carId");
  const imageUrl = form.watch("imageUrl");
  const title = form.watch("title");
  const titleIt = form.watch("titleIt");
  const description = form.watch("description");
  const descriptionIt = form.watch("descriptionIt");
  const personName = form.watch("personName");
  const isItalian = editingLanguage === "it";
  const titleField = isItalian ? "titleIt" : "title";
  const descriptionField = isItalian ? "descriptionIt" : "description";
  const selectedCar = cars.find((car) => car.id === selectedCarId);
  const hasRequiredContent = Boolean(
    trimContent(title) &&
    (kind === "car"
      ? selectedCarId
      : trimContent(personName) && trimContent(description)),
  );
  const hasMeaningfulEdit =
    editing !== undefined &&
    (kind !== editing.kind ||
      trimContent(title) !== trimContent(editing.title) ||
      trimContent(titleIt) !== trimContent(editing.titleIt) ||
      selectedCarId !== editing.carId ||
      trimContent(personName) !== trimContent(editing.personName) ||
      trimContent(description) !== trimContent(editing.description) ||
      trimContent(descriptionIt) !== trimContent(editing.descriptionIt) ||
      imageUrl !== (editing.imageUrl ?? ""));
  const hasMeaningfulChanges =
    hasRequiredContent && (!editing || hasMeaningfulEdit);

  const discardUploadedPortrait = useCallback((key: string) => {
    void removeSpecialAwardPortrait(key).catch(() => undefined);
  }, []);

  useEffect(() => {
    unmountedRef.current = false;

    return () => {
      unmountedRef.current = true;
      activeUploadRef.current?.abort();

      const key = uploadedPortraitKeyRef.current;
      uploadedPortraitKeyRef.current = null;
      if (key && !preserveUploadedPortraitRef.current) {
        discardUploadedPortrait(key);
      }
    };
  }, [discardUploadedPortrait]);

  const validateValues = useCallback(() => {
    const parsed = (
      kind === "car" ? carAwardFormSchema : notableFigureAwardFormSchema
    ).safeParse(form.getValues());

    form.clearErrors(validationFields);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      validationFields.forEach((field) => {
        const message = fieldErrors[field]?.[0];
        if (message) form.setError(field, { message });
      });
    }

    return parsed;
  }, [form, kind]);

  const revalidateAfterSubmit = useCallback(() => {
    if (!validationAttemptedRef.current) return;
    void form.trigger(validationFields);
  }, [form]);

  useEffect(() => {
    onCanSaveChange(hasMeaningfulChanges);
    return () => onCanSaveChange(false);
  }, [hasMeaningfulChanges, onCanSaveChange]);

  useImperativeHandle(
    ref,
    () => ({
      save: () => {
        validationAttemptedRef.current = true;
        const parsed = validateValues();

        if (!parsed.success) {
          const fieldErrors = parsed.error.flatten().fieldErrors;
          setEditingLanguage(
            fieldErrors.titleIt || fieldErrors.descriptionIt ? "it" : "en",
          );
          return null;
        }

        preserveUploadedPortraitRef.current = true;
        return { ...parsed.data, kind };
      },
    }),
    [kind, validateValues],
  );

  return (
    <div className="space-y-5 px-4 py-4">
      <div>
        <Label>
          {labels.awardType} <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { value: "car", label: labels.carAward, Icon: CarIcon },
            { value: "figure", label: labels.notableFigure, Icon: User },
          ].map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              disabled={Boolean(editing)}
              aria-pressed={kind === value}
              onClick={() => setKind(value as SpecialAwardItem["kind"])}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                kind === value
                  ? "border-primary bg-primary/5 text-primary"
                  : "text-muted-foreground hover:bg-accent",
                editing && "cursor-not-allowed opacity-60",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        {editing ? (
          <p className="text-xs text-muted-foreground">{labels.typeLocked}</p>
        ) : null}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label>
            {labels.awardTitle}{" "}
            {editingLanguage === "en" && (
              <span className="text-destructive">*</span>
            )}
          </Label>
          <FormLanguageToggle
            size="sm"
            value={editingLanguage}
            onValueChange={setEditingLanguage}
            availability={{
              en: Boolean(title.trim()),
              it: Boolean(titleIt.trim()),
            }}
          />
        </div>
        <ControlledInput
          control={form.control}
          name={titleField}
          placeholder={
            isItalian ? labels.titlePlaceholderIt : labels.titlePlaceholderEn
          }
          onValueChange={revalidateAfterSubmit}
          error={{
            hasError: Boolean(form.formState.errors[titleField]),
            message: form.formState.errors[titleField]?.message,
          }}
        />
      </div>
      {kind === "car" ? (
        <div>
          <Label>
            {labels.car} <span className="text-destructive">*</span>
          </Label>
          {selectedCar ? (
            <div className="flex items-center gap-3 rounded-lg border bg-card p-3 mt-1">
              <AwardCarThumbnail car={selectedCar} className="size-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{selectedCar.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {selectedCar.year} · {selectedCar.owner}
                </p>
                {selectedCar.hideOwnerName ? (
                  <PrivateCollectionWarning
                    label={privacyT("privateCollection")}
                    hint={privacyT("privateCollectionHint")}
                  />
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectingCar(true)}
              >
                {labels.changeCar}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start mt-1"
              leftIcon={CarIcon}
              onClick={() => setSelectingCar(true)}
            >
              {labels.selectCar}
            </Button>
          )}
          {form.formState.errors.carId ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.carId.message}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <ControlledInput
            control={form.control}
            name="personName"
            label={labels.personName}
            required
            onValueChange={revalidateAfterSubmit}
            error={{
              hasError: Boolean(form.formState.errors.personName),
              message: form.formState.errors.personName?.message,
            }}
          />
          <div className="space-y-2">
            <Label>{labels.portrait}</Label>
            <div className="flex items-center gap-4">
              <div className="relative size-20 overflow-hidden rounded-lg border bg-muted">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={labels.portrait}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Image
                      src={BlankPerson}
                      alt={labels.portrait}
                      fill
                      sizes="62px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 w-fit flex-col items-start gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={ImageUp}
                  loading={uploading}
                  disabled={uploading}
                  className="w-full"
                  onClick={() => fileRef.current?.click()}
                >
                  {labels.uploadImage}
                </Button>
                {imageUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={X}
                    disabled={uploading}
                    className="text-muted-foreground"
                    onClick={() => {
                      const key = uploadedPortraitKeyRef.current;
                      uploadedPortraitKeyRef.current = null;
                      if (key) discardUploadedPortrait(key);
                      form.setValue("imageUrl", "", { shouldDirty: true });
                    }}
                  >
                    {labels.removeImage}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {labels.imagePlaceholder}
                  </span>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;

                  activeUploadRef.current?.abort();
                  const abortController = new AbortController();
                  activeUploadRef.current = abortController;
                  setUploading(true);
                  void uploadSpecialAwardPortrait(file, abortController.signal)
                    .then(({ key, publicUrl }) => {
                      if (
                        unmountedRef.current ||
                        activeUploadRef.current !== abortController
                      ) {
                        discardUploadedPortrait(key);
                        return;
                      }

                      const previousKey = uploadedPortraitKeyRef.current;
                      uploadedPortraitKeyRef.current = key;
                      preserveUploadedPortraitRef.current = false;
                      if (previousKey && previousKey !== key) {
                        discardUploadedPortrait(previousKey);
                      }
                      form.setValue("imageUrl", publicUrl, {
                        shouldDirty: true,
                      });
                    })
                    .catch((error: unknown) =>
                      !unmountedRef.current &&
                      error instanceof DOMException &&
                      error.name === "AbortError"
                        ? undefined
                        : toast.error(
                            error instanceof Error
                              ? error.message
                              : "Unable to upload image.",
                          ),
                    )
                    .finally(() => {
                      if (
                        !unmountedRef.current &&
                        activeUploadRef.current === abortController
                      ) {
                        activeUploadRef.current = null;
                        setUploading(false);
                      }
                    });
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label>
              {labels.description}{" "}
              {editingLanguage === "en" && (
                <span className="text-destructive">*</span>
              )}
            </Label>
            <FormLanguageToggle
              size="sm"
              value={editingLanguage}
              onValueChange={setEditingLanguage}
              availability={{
                en: Boolean(description.trim()),
                it: Boolean(descriptionIt.trim()),
              }}
            />
          </div>
          <ControlledTextarea
            control={form.control}
            name={descriptionField}
            onValueChange={revalidateAfterSubmit}
            error={{
              hasError: Boolean(form.formState.errors[descriptionField]),
              message: form.formState.errors[descriptionField]?.message,
            }}
          />
        </>
      )}
      <Dialog open={selectingCar} onOpenChange={setSelectingCar}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="font-heading text-xl">
              {labels.selectCarTitle}
            </DialogTitle>
            <DialogDescription>{labels.pickerDescription}</DialogDescription>
          </DialogHeader>
          <AwardCarPicker
            cars={cars}
            classes={classes}
            currentCarId={selectedCarId}
            onSelect={(carId) => {
              form.setValue("carId", carId, {
                shouldDirty: true,
              });
              revalidateAfterSubmit();
              setSelectingCar(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
});

SpecialAwardForm.displayName = "SpecialAwardForm";
