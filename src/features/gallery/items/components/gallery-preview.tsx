"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronDown, Mail, Menu } from "lucide-react";

import AnantaraLogo from "@/public/images/logo-black.png";
import { cn } from "@/src/lib/utils";
import type { GalleryGroup, GalleryImage } from "../gallery-items.types";
import { GalleryProgressiveImage } from "./gallery-progressive-image";

type GalleryPreviewLabels = {
  home: string;
  about: string;
  enterCar: string;
  becomePartner: string;
  gallery: string;
  ticketsComingSoon: string;
  menu: string;
  language: string;
  event: string;
  description: string;
  enquiries: string;
  email: string;
  empty: string;
};

export function GalleryPreview({
  groups,
  images,
  labels,
}: {
  groups: GalleryGroup[];
  images: GalleryImage[];
  labels: GalleryPreviewLabels;
}) {
  const liveGroups = groups.filter((group) => !group.removed);
  const [selectedId, setSelectedId] = useState(liveGroups[0]?.id ?? null);
  const active =
    liveGroups.find((group) => group.id === selectedId) ?? liveGroups[0];
  const visibleImages = active
    ? images.filter((image) => !image.removed && image.groupId === active.id)
    : [];
  const navigation = [
    labels.home,
    labels.about,
    labels.enterCar,
    labels.becomePartner,
    labels.gallery,
  ];

  return (
    <main className="min-h-full bg-white text-[#1c1917]">
      <header className="flex items-center justify-between gap-6 px-6 py-6 sm:px-10 lg:px-14">
        <div className="flex items-center gap-9">
          <Image
            src={AnantaraLogo}
            alt="Anantara Concorso Roma"
            priority
            className="size-11 object-contain"
          />
          <nav className="hidden items-center gap-7 text-[15px] lg:flex">
            {navigation.map((item) => (
              <span
                key={item}
                className={cn(
                  item === labels.gallery && "font-semibold text-[#c71a4e]",
                )}
              >
                {item}
              </span>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm sm:gap-4">
          <span className="hidden rounded-full bg-[#ffedf2] px-5 py-2 text-[#c71a4e] sm:inline">
            {labels.ticketsComingSoon}
          </span>
          <span className="flex items-center gap-2 rounded-full border border-[#c71a4e]/40 px-4 py-2 text-[#c71a4e]">
            {labels.menu} <Menu className="size-4" />
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            {labels.language} <ChevronDown className="size-3.5" />
          </span>
        </div>
      </header>

      <section
        className="border-b border-[#f0e5e8] px-6 pt-16 pb-20 text-center sm:px-10 lg:px-14"
        style={{
          background:
            "radial-gradient(105% 60% at 50% 0%, #FFEFF3 0%, #FFF8FA 38%, #FFFFFF 76%)",
        }}
      >
        <p className="font-heading text-[15px] text-[#c71a4e]">
          {labels.event}
        </p>
        <h1 className="mt-5 font-heading text-5xl leading-tight sm:text-6xl">
          {labels.gallery}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-8 text-[#57534e]">
          {labels.description}
        </p>

        <div className="mx-auto mt-9 flex max-w-lg flex-col items-center justify-center gap-3 rounded-2xl bg-white px-7 py-6 shadow-[0_18px_60px_rgba(28,25,23,0.08)] ring-1 ring-[#e8e5e0]">
          <p className="font-heading text-xl">{labels.enquiries}</p>
          <div className="flex items-center gap-2 text-[15px] text-[#57534e]">
            <Mail className="size-4 shrink-0 text-[#c71a4e]" />
            {labels.email}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:px-14">
        {liveGroups.length > 1 ? (
          <div className="mb-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-b border-[#f0e5e8]">
            {liveGroups.map((group) => {
              const isActive = group.id === active?.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedId(group.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "-mb-px border-b-2 px-1 pb-3 text-[15px] transition-colors",
                    isActive
                      ? "border-[#c71a4e] font-semibold text-[#c71a4e]"
                      : "border-transparent text-[#57534e] hover:text-[#1c1917]",
                  )}
                >
                  {group.name}
                </button>
              );
            })}
          </div>
        ) : null}

        {visibleImages.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleImages.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#f5f3f0]"
              >
                <GalleryProgressiveImage
                  src={image.imageUrl}
                  alt=""
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  hoverZoom
                  className="object-cover object-center"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[#e8e5e0] bg-[#fafafa] text-sm text-[#79716b]">
            {labels.empty}
          </div>
        )}
      </section>
    </main>
  );
}
