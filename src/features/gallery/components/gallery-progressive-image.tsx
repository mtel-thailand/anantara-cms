"use client";

import Image from "next/image";
import { memo, useState } from "react";

import { cn } from "@/src/lib/utils";

type GalleryProgressiveImageProps = {
  alt: string;
  className?: string;
  draggable?: boolean;
  hoverZoom?: boolean;
  sizes: string;
  src: string;
};

export const GalleryProgressiveImage = memo(function GalleryProgressiveImage({
  src,
  alt,
  sizes,
  className,
  hoverZoom = false,
  draggable,
}: GalleryProgressiveImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === src;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      loading="lazy"
      draggable={draggable}
      sizes={sizes}
      onLoad={() => setLoadedSrc(src)}
      className={cn(
        "scale-[1.02] opacity-0 blur-sm transition-[filter,opacity,transform] duration-300 ease-out",
        loaded && "scale-100 opacity-100 blur-none",
        loaded && hoverZoom && "group-hover:scale-[1.03] transition-[scale] duration-300",
        className,
      )}
    />
  );
});
