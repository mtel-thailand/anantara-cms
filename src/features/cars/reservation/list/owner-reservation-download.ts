"use client";

import type { OwnerReservationDetail } from "@/src/features/cars/reservation/list/owner-reservation-list.types";
import { formatDate } from "@/src/lib/date";

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function text(value: string | null) {
  return value ?? "";
}

function safeName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
}

export function downloadOwnerReservation(reservation: OwnerReservationDetail) {
  const ownerName = [reservation.owner_forenames, reservation.owner_surname]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
  const rows: [string, string, string][] = [
    ["Registration", "Owner", ownerName],
    ["Registration", "Email", text(reservation.owner_email)],
    ["Registration", "Cars", reservation.carNames.join("; ")],
    ["Owner", "Title", text(reservation.owner_title)],
    ["Owner", "Surname", text(reservation.owner_surname)],
    ["Owner", "Forename(s)", text(reservation.owner_forenames)],
    ["Owner", "Address", text(reservation.owner_address)],
    ["Owner", "PostCode / ZIP", text(reservation.owner_zip_code)],
    ["Owner", "Country", text(reservation.owner_country)],
    ["Owner", "Mobile / cell no.", text(reservation.owner_phone_number)],
    ["Owner", "Email", text(reservation.owner_email)],
    ["Guest", "Title", text(reservation.guest_title)],
    ["Guest", "Surname", text(reservation.guest_surname)],
    ["Guest", "Forename(s)", text(reservation.guest_forenames)],
    ["Guest", "Country", text(reservation.guest_country)],
    [
      "Personal assistant",
      "Title",
      text(reservation.assistant_title),
    ],
    ["Personal assistant", "Surname", text(reservation.assistant_surname)],
    [
      "Personal assistant",
      "Forename(s)",
      text(reservation.assistant_forenames),
    ],
    ["Personal assistant", "Country", text(reservation.assistant_country)],
    ["Personal assistant", "Email", text(reservation.assistant_email)],
    [
      "Personal assistant",
      "Cell no.",
      text(reservation.assistant_phone_number),
    ],
    [
      "Invoice details",
      "Invoice to",
      reservation.invoice_recipient === "owner"
        ? "Invoice me"
        : reservation.invoice_recipient === "company"
          ? "Invoice the company"
          : "",
    ],
    [
      "Invoice details",
      "Company name",
      text(reservation.invoice_name_or_company),
    ],
    ["Invoice details", "Address", text(reservation.invoice_address)],
    ["Invoice details", "PostCode / ZIP", text(reservation.invoice_zip_code)],
    ["Invoice details", "Country", text(reservation.invoice_country)],
    ["Invoice details", "VAT number", text(reservation.invoice_vat_number)],
    ["Invoice details", "IATA", text(reservation.invoice_iata_code)],
    ["Invoice details", "Email", text(reservation.invoice_email)],
    [
      "Invoice details",
      "Italian companies: PEC / SDI",
      text(reservation.invoice_pec_or_sdi),
    ],
    ["Reservation details", "Owner’s package", reservation.ownerPackageName],
    ["Reservation details", "Room category", reservation.roomCategoryName],
    [
      "Reservation details",
      "Arrival date",
      reservation.arrival_date ? formatDate(reservation.arrival_date) : "",
    ],
    [
      "Reservation details",
      "Departure date",
      reservation.departure_date ? formatDate(reservation.departure_date) : "",
    ],
  ];
  const csv = `\uFEFFSection,Field,Value\r\n${rows
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}`;
  const fileName = safeName(
    `Owner registration — ${ownerName || reservation.owner_email || reservation.id}`,
  );
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
