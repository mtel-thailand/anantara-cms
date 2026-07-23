"use client";

import ControlledInput from "@/src/components/form/input";
import ControlledFileUploadSection from "@/src/components/form/file-upload-section";
import { FormLanguageToggle } from "@/src/components/form/language-toggle";
import ControlledTextarea from "@/src/components/form/textarea";
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { formatDate } from "@/src/lib/date";
import type { Locale } from "@/src/types/locale";
import type { Control, FieldErrors, UseFormClearErrors } from "react-hook-form";

import { CarImageManager } from "./car-image-manager";
import {
  submissionVehicleName,
  type CarSubmission,
} from "@/src/features/cars/submission/submission.types";
import type { SubmissionReviewFormValues } from "../submission-review.schema";
import { useTranslations } from "next-intl";

function FieldDivider() {
  return <div className="h-px bg-border" />;
}

type ReviewFormControlProps = {
  clearErrors: UseFormClearErrors<SubmissionReviewFormValues>;
  control: Control<SubmissionReviewFormValues>;
  errors: FieldErrors<SubmissionReviewFormValues>;
};

export function CarDetailsCard({
  clearErrors,
  control,
  draft,
  editLocale,
  errors,
  isArchived,
  onImageFilesAdded,
  onImagesChange,
  setEditLocale,
  submission,
}: ReviewFormControlProps & {
  draft: SubmissionReviewFormValues;
  editLocale: Locale;
  isArchived: boolean;
  onImageFilesAdded: (files: Array<{ id: string; file: File }>) => void;
  onImagesChange: (images: SubmissionReviewFormValues["images"]) => void;
  setEditLocale: (locale: Locale) => void;
  submission: CarSubmission;
}) {
  const t = useTranslations("cars.submission.review");
  const historyField = `history.${editLocale}` as const;
  const hasImageError = Boolean(errors.images);
  const savedDocuments = draft.documents.filter(
    (document) => !document.id.startsWith("temp-document-"),
  );
  return (
    <Card className="flex flex-col gap-6 p-5 shadow-none">
      <h2 className="text-sm font-semibold">{t("carDetails")}</h2>

      <div className="flex flex-col gap-1.5">
        <CarImageManager
          images={draft.images}
          name={submissionVehicleName(draft)}
          required
          compact
          disabled={isArchived}
          invalid={hasImageError}
          onChange={onImagesChange}
          onFilesAdded={onImageFilesAdded}
        />
        {errors.images?.message ? (
          <p className="text-sm text-destructive">{errors.images.message}</p>
        ) : null}
      </div>

      <FieldDivider />

      <section>
        <h3 className="mb-3 text-sm font-semibold">{t("personalInformation")}</h3>
        <fieldset
          disabled={isArchived}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3"
        >
          <ControlledInput<SubmissionReviewFormValues>
            control={control}
            name="owner.lastName"
            label={t("name")}
            required
            data-review-field="lastName"
            aria-invalid={Boolean(errors.owner?.lastName)}
            error={{
              hasError: Boolean(errors.owner?.lastName),
              message: errors.owner?.lastName?.message,
            }}
            onValueChange={() => clearErrors("owner.lastName")}
          />
          <ControlledInput<SubmissionReviewFormValues>
            control={control}
            name="owner.firstName"
            label={t("firstNames")}
            required
            data-review-field="firstName"
            aria-invalid={Boolean(errors.owner?.firstName)}
            error={{
              hasError: Boolean(errors.owner?.firstName),
              message: errors.owner?.firstName?.message,
            }}
            onValueChange={() => clearErrors("owner.firstName")}
          />
          <ControlledInput<SubmissionReviewFormValues>
            control={control}
            name="owner.email"
            label={t("email")}
            required
            type="email"
            data-review-field="email"
            aria-invalid={Boolean(errors.owner?.email)}
            error={{
              hasError: Boolean(errors.owner?.email),
              message: errors.owner?.email?.message,
            }}
            onValueChange={() => clearErrors("owner.email")}
          />
          <ControlledInput<SubmissionReviewFormValues>
            control={control}
            name="owner.mobile"
            label={t("mobile")}
            type="tel"
          />
          <div className="col-span-2 sm:col-span-1">
            <ControlledInput<SubmissionReviewFormValues>
              control={control}
              name="owner.address"
              label={t("address")}
            />
          </div>
          <ControlledInput<SubmissionReviewFormValues>
            control={control}
            name="owner.postcode"
            label={t("postcode")}
          />
        </fieldset>
      </section>

      <FieldDivider />

      <section>
        <h3 className="mb-3 text-sm font-semibold">{t("vehicleInformation")}</h3>
        <fieldset
          disabled={isArchived}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3"
        >
          <ControlledInput<SubmissionReviewFormValues>
            control={control}
            name="vehicle.make"
            label={t("make")}
            required
            data-review-field="make"
            aria-invalid={Boolean(errors.vehicle?.make)}
            error={{
              hasError: Boolean(errors.vehicle?.make),
              message: errors.vehicle?.make?.message,
            }}
            onValueChange={() => clearErrors("vehicle.make")}
          />
          <ControlledInput<SubmissionReviewFormValues>
            control={control}
            name="vehicle.model"
            label={t("model")}
            required
            data-review-field="model"
            aria-invalid={Boolean(errors.vehicle?.model)}
            error={{
              hasError: Boolean(errors.vehicle?.model),
              message: errors.vehicle?.model?.message,
            }}
            onValueChange={() => clearErrors("vehicle.model")}
          />
          <ControlledInput<SubmissionReviewFormValues>
            control={control}
            name="year"
            label={t("year")}
            required
            type="number"
            data-review-field="year"
            aria-invalid={Boolean(errors.year)}
            error={{
              hasError: Boolean(errors.year),
              message: errors.year?.message,
            }}
            onValueChange={() => clearErrors("year")}
          />
          <ControlledInput<SubmissionReviewFormValues>
            control={control}
            name="vehicle.bodyStyle"
            label={t("bodyStyle")}
          />
          <ControlledInput<SubmissionReviewFormValues>
            control={control}
            name="vehicle.coachbuilder"
            label={t("coachbuilder")}
          />
          <ControlledInput<SubmissionReviewFormValues>
            control={control}
            name="vehicle.exteriorColour"
            label={t("exteriorColours")}
          />
          <ControlledInput<SubmissionReviewFormValues>
            control={control}
            name="vehicle.chassisNumber"
            label={t("chassisNumber")}
          />
          <ControlledInput<SubmissionReviewFormValues>
            control={control}
            name="vehicle.engineNumber"
            label={t("engineNumber")}
          />
          <Input
            label={t("submissionDate")}
            value={formatDate(submission.submissionDate)}
            disabled
          />
          <Input
            label={t("referenceNumber")}
            value={submission.vehicleRef}
            disabled
          />
        </fieldset>
      </section>

      <FieldDivider />

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t("vehicleHistory")}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t("editingLanguage")}
            </span>
            <FormLanguageToggle
              size="sm"
              value={editLocale}
              onValueChange={setEditLocale}
              availability={{
                en: Boolean(draft.history.en.trim()),
                it: Boolean(draft.history.it.trim()),
              }}
            />
          </div>
        </div>
        <ControlledTextarea<SubmissionReviewFormValues>
          control={control}
          name={historyField}
          label={t("descriptionLanguage", { locale: editLocale.toUpperCase() })}
          required
          data-review-field="history"
          aria-invalid={Boolean(errors.history?.en || errors.history?.it)}
          error={{
            hasError: Boolean(errors.history?.en || errors.history?.it),
            message: errors.history?.en?.message ?? errors.history?.it?.message,
          }}
          rows={4}
          disabled={isArchived}
          onValueChange={() => clearErrors(["history.en", "history.it"])}
        />
      </section>

      <ControlledFileUploadSection<SubmissionReviewFormValues>
        control={control}
        name="documentFiles"
        previewFiles={savedDocuments}
        disabled={isArchived}
        required
        emptyText={
          savedDocuments.length
            ? t("noNewDocuments")
            : t("noDocuments")
        }
        enabledRemove={false}
      />
    </Card>
  );
}
