import { useTranslations } from "next-intl";

import type { OwnerReservationDetail } from "../../list/owner-reservation-list.types";
import { formatDate } from "@/src/lib/date";
import {
  ReviewBool,
  ReviewField,
  ReviewSection,
} from "./reservation-review-fields";

export function OwnerRegistrationView({
  reservation,
}: {
  reservation: OwnerReservationDetail;
}) {
  const t = useTranslations("cars.reservation.review");
  const returned =
    reservation.status === "received" ||
    reservation.status === "approved" ||
    reservation.status === "requested";
  const value = (current: string | null) => (returned ? current : null);
  const field = (label: string, current: string | null) => (
    <ReviewField label={t(label)} value={returned ? (current ?? "") : ""} />
  );

  return (
    <div className="flex flex-col gap-6">
      {!returned ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          {t("awaitingForm")}
        </p>
      ) : null}
      <ReviewSection title={t("owner")}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {field("titleField", value(reservation.owner_title))}
          {field("surname", value(reservation.owner_surname))}
          {field("forenames", value(reservation.owner_forenames))}
          <ReviewField
            label={t("address")}
            value={value(reservation.owner_address) ?? ""}
            className="col-span-2 sm:col-span-1"
          />
          {field("postcode", value(reservation.owner_zip_code))}
          {field("country", value(reservation.owner_country))}
          {field("mobile", value(reservation.owner_phone_number))}
          {field("email", value(reservation.owner_email))}
        </div>
      </ReviewSection>
      <div className="border-t" />
      <ReviewSection title={t("guest")}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {field("titleField", reservation.guest_title)}
          {field("surname", reservation.guest_surname)}
          {field("forenames", reservation.guest_forenames)}
          {field("country", reservation.guest_country)}
        </div>
      </ReviewSection>
      <div className="border-t" />
      <ReviewSection title={t("assistant")}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {field("titleField", reservation.assistant_title)}
          {field("surname", reservation.assistant_surname)}
          {field("forenames", reservation.assistant_forenames)}
          {field("country", reservation.assistant_country)}
          {field("email", reservation.assistant_email)}
          {field("cell", reservation.assistant_phone_number)}
        </div>
      </ReviewSection>
      <div className="border-t" />
      <ReviewSection title={t("invoiceDetails")}>
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1">
          <ReviewBool
            label={t("invoiceMe")}
            value={returned ? reservation.invoice_recipient === "owner" : null}
          />
          <ReviewBool
            label={t("invoiceCompany")}
            value={
              returned ? reservation.invoice_recipient === "company" : null
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {field("companyName", reservation.invoice_name_or_company)}
          <ReviewField
            label={t("address")}
            value={returned ? (reservation.invoice_address ?? "") : ""}
            className="col-span-2 sm:col-span-1"
          />
          {field("postcode", reservation.invoice_zip_code)}
          {field("country", reservation.invoice_country)}
          {field("vatNumber", reservation.invoice_vat_number)}
          {field("iata", reservation.invoice_iata_code)}
          {field("email", reservation.invoice_email)}
          {field("pecSdi", reservation.invoice_pec_or_sdi)}
        </div>
      </ReviewSection>
      <div className="border-t" />
      <ReviewSection title={t("reservationDetails")}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <ReviewField
            label={t("ownerPackage")}
            value={returned ? reservation.ownerPackageName : ""}
            className="col-span-2"
          />
          {field("roomCategory", reservation.roomCategoryName)}
          <ReviewField
            label={t("arrivalDate")}
            value={
              returned && reservation.arrival_date
                ? formatDate(reservation.arrival_date)
                : ""
            }
          />
          <ReviewField
            label={t("departureDate")}
            value={
              returned && reservation.departure_date
                ? formatDate(reservation.departure_date)
                : ""
            }
          />
        </div>
      </ReviewSection>
    </div>
  );
}
