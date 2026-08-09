import { Download, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  ReviewBool,
  ReviewField,
  ReviewSection,
} from "@/src/features/cars/reservation/review/components/reservation-review-fields";
import type { CarEntryFormReviewDetail } from "@/src/features/cars/reservation/review/car-entry-form-review.types";

type DocumentLink = { key?: string; name: string; url: string };

function documentDownloadUrl(document: DocumentLink) {
  return document.key
    ? `/api/file?${new URLSearchParams({
        key: document.key,
        response: "content",
      })}`
    : document.url;
}

function documentLinks(value: unknown): DocumentLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const document = item as Record<string, unknown>;
    const publicUrl =
      typeof document.publicUrl === "string" ? document.publicUrl : "";
    const storedUrl = typeof document.url === "string" ? document.url : "";
    const url = publicUrl || storedUrl;
    if (!url) return [];
    return [
      {
        key: publicUrl && storedUrl ? storedUrl : undefined,
        name:
          typeof document.name === "string"
            ? document.name
            : `Document ${index + 1}`,
        url,
      },
    ];
  });
}

export function CarEntryFormView({
  detail,
}: {
  detail: CarEntryFormReviewDetail;
}) {
  const t = useTranslations("cars.reservation.carReview");
  const { form, technicians } = detail;
  const returned =
    form.status === "received" ||
    form.status === "approved" ||
    (form.status === "requested" && form.received_at !== null);
  const text = (value: string | number | null | undefined) =>
    returned && value !== null && value !== undefined ? String(value) : "";
  const documents = documentLinks(form.registration_certificate_documents);

  return (
    <div className="flex flex-col gap-6">
      {!returned ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          {t("awaitingForm")}
        </p>
      ) : null}

      <ReviewSection title={t("ownerInformation")}>
        <div className="flex flex-col gap-3">
          <ReviewField
            label={t("ownerCollectionName")}
            value={text(form.owner_collection_name)}
          />
          <ReviewBool
            label={t("hideOwnerName")}
            value={returned ? form.hide_owner_name : null}
          />
        </div>
      </ReviewSection>

      <div className="border-t" />
      <ReviewSection title={t("vehicleInformation")}>
        <ReviewField
          label={t("registrationNumber")}
          value={text(form.registration_plate_number)}
        />
      </ReviewSection>

      <div className="border-t" />
      <ReviewSection title={t("technicalDetails")}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <ReviewField label={t("engineMake")} value={text(form.engine_make)} />
          <ReviewField
            label={t("engineCapacity")}
            value={text(form.engine_capacity)}
          />
          <ReviewField
            label={t("engineConfiguration")}
            value={text(form.engine_configuration)}
          />
          <ReviewField
            label={t("cylinders")}
            value={text(form.number_of_cylinders)}
          />
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <ReviewBool
            label={t("coachworkOriginal")}
            value={returned ? form.is_coachwork_original : null}
          />
          <ReviewBool
            label={t("engineOriginal")}
            value={returned ? form.is_engine_original : null}
          />
        </div>
      </ReviewSection>

      <div className="border-t" />
      <ReviewSection title={t("dimensions")}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <ReviewField label={t("length")} value={text(form.length_mm)} />
          <ReviewField label={t("height")} value={text(form.height_mm)} />
          <ReviewField label={t("width")} value={text(form.width_mm)} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t("dimensionsDescription")}
        </p>
      </ReviewSection>

      <div className="border-t" />
      <ReviewSection title={t("images")}>
        <ReviewField
          label={t("highResolutionPhotos")}
          value={text(form.high_resolution_photos_link)}
        />
      </ReviewSection>

      <div className="border-t" />
      <ReviewSection title={t("registrationCertificate")}>
        <div className="flex flex-col gap-3">
          {documents.map((document) => (
            <a
              key={document.url}
              href={documentDownloadUrl(document)}
              download={document.name}
              className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm hover:bg-muted/60"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{document.name}</span>
              </span>
              <Download className="size-4 shrink-0 text-muted-foreground" />
            </a>
          ))}
          <ReviewBool
            label={t("unableCertificate")}
            value={
              returned ? form.unable_to_provide_registration_certificate : null
            }
          />
          <p className="pl-6.5 text-xs text-muted-foreground">
            {t("certificateResponsibility")}
          </p>
        </div>
      </ReviewSection>

      <div className="border-t" />
      <ReviewSection title={t("vehicleStatus")}>
        <div className="flex flex-col gap-1">
          <ReviewBool
            label={t("enterForJudging")}
            value={returned ? form.enter_for_judging : null}
          />
          <ReviewBool
            label={t("licensedForRoad")}
            value={returned ? form.is_licensed_for_public_highway : null}
          />
          <ReviewBool
            label={t("nonRunner")}
            value={returned ? form.is_non_runner : null}
          />
        </div>
        <div className="mt-3">
          <ReviewField
            label={t("secondCarDetails")}
            value={text(form.second_car_details)}
          />
        </div>
      </ReviewSection>

      <div className="border-t" />
      <ReviewSection title={t("detailing")}>
        <div className="flex flex-col gap-1">
          <ReviewBool
            label={t("doNotClean")}
            value={
              returned ? form.detailing_preference === "no_cleaning" : null
            }
          />
          <ReviewBool
            label={t("dryAndDust")}
            value={
              returned
                ? form.detailing_preference === "dried_and_lightly_dusted"
                : null
            }
          />
        </div>
        <div className="mt-3">
          <ReviewField
            label={t("specialRequirements")}
            value={text(form.special_requirements)}
          />
        </div>
      </ReviewSection>

      <div className="border-t" />
      <ReviewSection title={t("transportDetails")}>
        <div className="flex flex-col gap-4">
          <ReviewBool
            label={t("transportDriving")}
            value={
              returned ? form.transport_method === "drive_to_piazza" : null
            }
          />
          <div className="flex flex-col gap-2.5">
            <ReviewBool
              label={t("transportOwnTrailer")}
              value={
                returned ? form.transport_method === "self_transport" : null
              }
            />
            <div className="pl-6.5">
              <ReviewField
                label={t("trailerRegistration")}
                value={text(form.trailer_registration_number)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <ReviewBool
              label={t("transportCompanyOption")}
              value={
                returned ? form.transport_method === "transport_company" : null
              }
            />
            <div className="grid grid-cols-2 gap-4 pl-6.5">
              <ReviewField
                label={t("transportCompany")}
                value={text(form.transport_company_name)}
              />
              <ReviewField
                label={t("transportContact")}
                value={text(form.transport_contact_name)}
              />
              <ReviewField
                label={t("transportPhone")}
                value={text(form.transport_contact_phone)}
              />
              <ReviewField
                label={t("transportEmail")}
                value={text(form.transport_contact_email)}
              />
            </div>
          </div>
        </div>
      </ReviewSection>

      <div className="border-t" />
      <ReviewSection title={t("technicians")}>
        <ReviewBool
          label={t("dedicatedPersonnel")}
          value={returned ? form.has_dedicated_personnel : null}
        />
        {technicians.map((technician, index) => (
          <div key={technician.id} className="mt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t("technicianNumber", { number: index + 1 })}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <ReviewField label={t("forename")} value={technician.forename} />
              <ReviewField label={t("surname")} value={technician.surname} />
              <ReviewField
                label={t("address")}
                value={technician.address ?? ""}
                className="col-span-2 sm:col-span-1"
              />
              <ReviewField
                label={t("postcode")}
                value={technician.zip_code ?? ""}
              />
              <ReviewField
                label={t("country")}
                value={technician.country ?? ""}
              />
              <ReviewField
                label={t("mobile")}
                value={technician.phone_number ?? ""}
              />
              <ReviewField
                label={t("ownerEmail")}
                value={technician.email ?? ""}
              />
            </div>
          </div>
        ))}
        <div className="mt-4">
          <ReviewField
            label={t("extraTickets")}
            value={text(form.extra_tickets_needed)}
          />
        </div>
      </ReviewSection>
    </div>
  );
}
