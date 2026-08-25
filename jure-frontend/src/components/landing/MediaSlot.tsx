import React, { useEffect, useState } from "react";

type MediaSlotProps = {
  /** Public path under /images or /videos, e.g. /images/hero-product.png */
  src: string;
  /** Filename hint shown while the asset is missing */
  fileName: string;
  alt: string;
  kind?: "image" | "video";
  className?: string;
  aspect?: string;
  /** Shown until the real asset exists at `src` */
  fallback?: React.ReactNode;
};

/**
 * Marketing media slot. Renders the real asset when present; otherwise shows
 * `fallback` (or an empty labeled frame). Drop files into `public/images/`
 * using the exact `fileName`.
 */
const MediaSlot: React.FC<MediaSlotProps> = ({
  src,
  fileName,
  alt,
  kind = "image",
  className = "",
  aspect = "aspect-[16/10]",
  fallback,
}) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    if (kind === "video") {
      const video = document.createElement("video");
      const mark = () => {
        if (!cancelled) setReady(true);
      };
      video.onloadeddata = mark;
      video.onerror = () => {
        if (!cancelled) setReady(false);
      };
      video.src = src;
      video.load();
      return () => {
        cancelled = true;
        video.onloadeddata = null;
        video.onerror = null;
        video.src = "";
      };
    }

    const img = new Image();
    img.onload = () => {
      if (!cancelled) setReady(true);
    };
    img.onerror = () => {
      if (!cancelled) setReady(false);
    };
    img.src = src;
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [src, kind]);

  const badge = import.meta.env.DEV ? (
    <span className="landing-media-slot__badge" title={`Add ${fileName} to public/images/`}>
      {fileName}
    </span>
  ) : null;

  if (ready && kind === "video") {
    return (
      <div className={`relative overflow-hidden rounded-2xl ${aspect} ${className}`}>
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={src}
          muted
          playsInline
          autoPlay
          loop
          aria-label={alt}
        />
      </div>
    );
  }

  if (ready && kind === "image") {
    return (
      <div className={`relative overflow-hidden rounded-2xl ${aspect} ${className}`}>
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover object-top"
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  if (fallback) {
    return (
      <div className={`relative ${className}`}>
        {fallback}
        {badge}
      </div>
    );
  }

  return (
    <div
      className={`landing-media-slot relative flex flex-col items-center justify-center gap-2 rounded-2xl ${aspect} ${className}`}
      role="img"
      aria-label={`${alt} — add ${fileName}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64499D]/70 dark:text-[#CFC2FF]/70">
        Media slot
      </span>
      <span className="px-3 py-1 rounded-md bg-[#64499D]/8 dark:bg-[#64499D]/20 text-xs font-mono text-[#64499D] dark:text-[#CFC2FF]">
        {fileName}
      </span>
      <span className="max-w-[16rem] text-center text-[11px] text-slate-500 dark:text-slate-400 leading-snug px-4">
        {alt}
      </span>
    </div>
  );
};

export default MediaSlot;
