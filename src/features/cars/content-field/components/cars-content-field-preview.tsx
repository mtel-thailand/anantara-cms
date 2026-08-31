"use client";

import { ChevronDown, ChevronLeft, Menu, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { DialogDescription, DialogTitle } from "@/src/components/ui/dialog";
import { romanNumeral } from "@/src/features/cars/car-class-number.helpers";
import type { CarClass } from "@/src/features/cars/classes/car-classes.types";
import { cn } from "@/src/lib/utils";
import type {
  ContentFieldLocale,
  ContentFieldPreviewProps,
} from "@/src/features/content-field/content-field.types";

function PreviewContent({
  content,
  surface,
}: {
  content: string;
  surface: "app" | "desktop";
}) {
  const t = useTranslations("cars.contentField");

  if (!content.trim()) {
    return <p className="text-muted-foreground">{t("previewEmpty")}</p>;
  }

  return (
    <div
      className={cn(
        "[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-left [&_blockquote]:italic [&_h1]:font-heading [&_h1]:text-[#1c1917] [&_h2]:font-heading [&_h2]:text-[#1c1917] [&_h3]:font-heading [&_h3]:text-[#1c1917] [&_img]:mx-auto [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6",
        surface === "desktop"
          ? "[&_blockquote]:my-3 [&_h1]:text-[44px] [&_h1]:leading-tight [&_h2]:text-[32px] [&_h3]:text-[20px] [&_img]:my-3 [&_p]:my-2"
          : "[&_blockquote]:my-3 [&_h1]:mb-1 [&_h1]:text-[26px] [&_h1]:leading-tight [&_h2]:mb-1 [&_h2]:mt-4 [&_h2]:text-[21px] [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-[17px] [&_img]:my-3 [&_li]:my-1 [&_ol]:my-2 [&_ol]:pl-5 [&_p]:my-2 [&_p]:leading-relaxed [&_table]:my-2 [&_table]:w-full [&_td]:py-1.5 [&_td]:pr-3 [&_td]:align-top [&_ul]:my-2 [&_ul]:pl-5",
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

function WebsitePreview({
  classes,
  content,
  locale,
}: {
  classes: CarClass[];
  content: string;
  locale: ContentFieldLocale;
}) {
  const t = useTranslations("cars.contentField");

  return (
    <div className="h-full overflow-y-auto bg-[radial-gradient(120%_38%_at_50%_0%,#ffeff3_0%,#fff8fa_32%,#fff_62%)] text-[#1c1917]">
      <header className="flex items-center justify-between gap-6 px-10 py-6">
        <div className="flex items-center gap-9">
          <Image
            src="/images/logo-black.png"
            alt="Anantara Concorso Roma"
            width={104}
            height={44}
            className="h-11 w-auto object-contain"
          />
          <nav className="hidden items-center gap-7 font-serif text-[15px] lg:flex">
            {t.raw("websiteNavigation").map((item: string) => (
              <span key={item}>{item}</span>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 font-serif text-[14px]">
          <span className="hidden rounded-full bg-[#ffedf2] px-5 py-2 text-primary sm:inline">
            {t("ticketsComingSoon")}
          </span>
          <span className="flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-primary">
            {t("menu")} <Menu className="size-4" />
          </span>
          <span className="flex items-center gap-1">
            {locale.toUpperCase()} <ChevronDown className="size-3.5" />
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-8 pb-16 pt-10 text-center font-serif text-[16px] leading-relaxed text-[#3a352f]">
        <div className="[&_a]:text-primary [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-left [&_blockquote]:italic [&_h1]:font-heading [&_h1]:text-[44px] [&_h1]:leading-tight [&_h1]:text-[#1c1917] [&_h2]:font-heading [&_h2]:text-[32px] [&_h2]:text-[#1c1917] [&_h3]:font-heading [&_h3]:text-[20px] [&_h3]:text-[#1c1917] [&_img]:mx-auto [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-md [&_p]:my-2">
          <PreviewContent content={content} surface="desktop" />
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {classes.map((carClass, index) => (
            <div
              key={carClass.id}
              className="flex flex-col items-center gap-1.5 rounded-md border border-[#e7e2dc] px-3 py-5 text-center"
            >
              <span className="text-[12px] font-semibold tracking-wide text-primary">
                {t("classNumber", { number: romanNumeral(index + 1) })}
              </span>
              <span className="text-[15px] leading-snug">{carClass.name}</span>
            </div>
          ))}
        </div>

        <p className="mb-16 mt-10 text-[13px] italic text-[#9a938b]">
          {t("classesSubjectToChange")}
        </p>
      </main>
    </div>
  );
}

function AppPreview({ content }: { content: string }) {
  return (
    <div className="mx-auto h-[88vh] max-h-[820px] w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-[2.25rem] border-[7px] border-stone-900 bg-white shadow-2xl">
      <div className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-[#f8f7f5]">
        <div className="flex h-9 shrink-0 items-end justify-between px-5 pb-1 text-[10px] font-semibold text-stone-800">
          <span>9:41</span>
          <span>5G&nbsp; 100%</span>
        </div>
        <div className="absolute left-1/2 top-2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-stone-900" />
        <header className="grid h-14 shrink-0 grid-cols-[36px_1fr_36px] items-center border-b border-stone-200 bg-white px-3">
          <ChevronLeft className="size-5 text-stone-500" />
          <Image
            src="/images/logo-black.png"
            alt="Anantara Concorso Roma"
            width={104}
            height={38}
            className="mx-auto h-8 w-auto object-contain"
          />
          <Menu className="size-5 justify-self-end text-stone-700" />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-6 text-[#1c1917]">
          <PreviewContent content={content} surface="app" />
        </main>
        <div className="flex h-6 shrink-0 items-center justify-center bg-white">
          <span className="h-1 w-28 rounded-full bg-stone-900" />
        </div>
      </div>
    </div>
  );
}

export function CarsContentFieldPreview({
  content,
  locale,
  onClose,
  previewData: classes,
  surface,
}: ContentFieldPreviewProps<CarClass[]>) {
  const t = useTranslations("cars.contentField");
  const app = surface === "app";
  const heroContent = app
    ? content.hero?.app?.en ?? ""
    : content.hero?.desktop?.[locale] ?? "";

  return (
    <>
      <div className="sr-only">
        <DialogTitle>{t("previewTitle", { surface: t(surface) })}</DialogTitle>
        <DialogDescription>{t("previewDescription")}</DialogDescription>
      </div>
      <button
        type="button"
        aria-label={t("closePreview")}
        className={cn(
          "absolute z-20 flex size-9 items-center justify-center rounded-full bg-white text-stone-600 shadow-lg ring-1 ring-black/10 transition-colors hover:text-stone-950",
          app ? "-right-3 -top-3" : "right-4 top-4 bg-white/80 shadow-sm backdrop-blur",
        )}
        onClick={onClose}
      >
        <X className="size-4" />
      </button>
      {app ? (
        <AppPreview content={heroContent} />
      ) : (
        <WebsitePreview classes={classes} content={heroContent} locale={locale} />
      )}
    </>
  );
}
