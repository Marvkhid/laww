"use client";

import { useEffect, useRef, useState } from "react";

/**
 * SafeImage — a plain `<img>` that cannot silently vanish.
 *
 * Editorial and advert artwork is served straight from Supabase Storage, a
 * third-party origin relative to this site. That makes it the one asset class
 * that a privacy setting, an extension, an offline moment or a storage outage
 * can take away. A bare `<img src={remote} className="h-auto w-full">` then
 * collapses to a 0-height box (measured: the advert slot on /events renders
 * 1104x0 before decode) and the reader sees a hole where the image was.
 *
 * SafeImage keeps the natural, uncropped aspect ratio the design requires — it
 * is still a plain `<img>`, not a cropped `next/image` fill — and adds only
 * two things:
 *
 *   1. a bounded retry for transient network failures, and
 *   2. a real error state showing the alt text, instead of a broken-image glyph.
 *
 * The retry works by changing the element `key`, which makes React remount the
 * `<img>` and issue a fresh request. The URL is deliberately left untouched so
 * signed or query-parameterised image URLs keep working.
 */
export function SafeImage({
  src,
  alt,
  className = "",
  label = "Image unavailable",
  maxRetries = 2,
}: {
  src: string;
  alt?: string | null;
  className?: string;
  /** Short text shown inside the placeholder box. */
  label?: string;
  maxRetries?: number;
}) {
  const [attempt, setAttempt] = useState(0);
  const nodeRef = useRef<HTMLImageElement | null>(null);
  const failed = attempt > maxRetries;

  // A request can settle before React attaches `onError`: blocked third-party
  // content fails almost instantly, and a server-rendered <img> starts loading
  // during streaming. Without this check the error event is simply lost and the
  // element sits there broken forever — reproduced in Chromium and WebKit.
  useEffect(() => {
    const node = nodeRef.current;
    if (node && node.complete && node.naturalWidth === 0) {
      setAttempt((n) => n + 1);
    }
  }, [attempt]);

  if (failed) {
    return (
      <div className="media-fallback" role="img" aria-label={alt || label}>
        {label}
      </div>
    );
  }

  return (
    // Deliberately a plain <img>, not next/image: editorial artwork must keep
    // its natural, uncropped aspect ratio, which a fixed-size Image with
    // object-cover would break.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={attempt}
      ref={(node) => {
        nodeRef.current = node;
      }}
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setAttempt((n) => n + 1)}
    />
  );
}
