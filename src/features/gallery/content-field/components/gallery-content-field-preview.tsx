"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { DialogDescription, DialogTitle } from "@/src/components/ui/dialog";
import type { ContentFieldPreviewProps } from "@/src/features/content-field/content-field.types";
import { GalleryPreview } from "@/src/features/gallery/components/gallery-preview";
import type { GalleryItemsData } from "@/src/features/gallery/gallery.types";

export function GalleryContentFieldPreview({
  content,
  locale,
  onClose,
  previewData,
}: ContentFieldPreviewProps<GalleryItemsData>) {
  const t = useTranslations("gallery.contentField");
  const header = content.header?.desktop?.[locale] ?? "";
  const email = content.contact_email?.web?.und ?? "";
  const navigation = t.raw("websiteNavigation") as string[];

  return (
    <>
      <div className="sr-only">
        <DialogTitle>{t("previewTitle")}</DialogTitle>
        <DialogDescription>{t("previewDescription")}</DialogDescription>
      </div>
      <button
        type="button"
        aria-label={t("closePreview")}
        className="absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-full bg-white/80 text-stone-600 shadow-sm ring-1 ring-black/10 backdrop-blur transition-colors hover:bg-white hover:text-stone-950"
        onClick={onClose}
      >
        <X className="size-4" />
      </button>
      <GalleryPreview
        descriptionHtml={header || `<p>${t("previewEmpty")}</p>`}
        email={email || t("emailPlaceholder")}
        groups={previewData.groups}
        images={previewData.images}
        locale={locale}
        labels={{
          home: navigation[0] ?? "",
          about: navigation[1] ?? "",
          enterCar: navigation[2] ?? "",
          becomePartner: navigation[3] ?? "",
          gallery: t("galleryTitle"),
          ticketsComingSoon: t("ticketsComingSoon"),
          menu: t("menu"),
          language: locale.toUpperCase(),
          event: "",
          description: "",
          enquiries: t("galleryEnquiries"),
          email: t("emailPlaceholder"),
          empty: t("previewEmpty"),
        }}
      />
    </>
  );
}
