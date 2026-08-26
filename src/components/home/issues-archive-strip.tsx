"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import type { IssueArchive } from "@/lib/types";

const DISMISS_KEY = "ld-archive-dismissed";

export function IssuesArchiveStrip({ issues }: { issues: IssueArchive[] }) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Check sessionStorage on mount
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(DISMISS_KEY);
      if (!dismissed && issues.length > 0) {
        setVisible(true);
      }
    } catch {
      // sessionStorage unavailable — show strip
      if (issues.length > 0) setVisible(true);
    }
  }, [issues.length]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  // Swipe-to-dismiss for touch devices
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
      // Horizontal swipe: dx > 80px and more horizontal than vertical
      if (Math.abs(dx) > 80 && Math.abs(dx) > dy * 1.5) {
        dismiss();
      }
    },
    [dismiss]
  );

  if (!visible || issues.length === 0) return null;

  return (
    <div
      ref={stripRef}
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Subtle gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-paper-warm/95 via-paper-warm/70 to-transparent" />

      <div className="relative">
        {/* Close button — desktop */}
        <button
          onClick={dismiss}
          aria-label="Dismiss archive"
          className="absolute -top-8 right-4 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-paper-warm/90 text-stone shadow-sm transition-colors hover:bg-ink hover:text-paper md:right-6"
        >
          <X size={14} />
        </button>

        {/* Section label */}
        <p className="relative mb-2 text-center font-admin text-[10px] font-medium uppercase tracking-[0.2em] text-stone/60">
          Issues Archive
        </p>

        {/* Scrolling track */}
        <div className="relative overflow-hidden pb-4">
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-paper-warm to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-paper-warm to-transparent" />

          <div
            className={`archive-scroll flex items-end gap-4 px-6 ${hovered ? "[animation-play-state:paused]" : ""}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {/* Duplicate for seamless loop */}
            {[...issues, ...issues].map((issue, i) => (
              <Link
                key={`${issue.slug}-${i}`}
                href="/issues"
                className="group relative shrink-0"
              >
                <div className="relative h-[90px] w-[63px] overflow-hidden border border-hairline/60 transition-all duration-300 group-hover:border-digest-red group-hover:shadow-md sm:h-[110px] sm:w-[77px] md:h-[130px] md:w-[91px]">
                  {issue.coverImageUrl ? (
                    <Image
                      src={issue.coverImageUrl}
                      alt={issue.title ?? `Issue ${issue.issueNumber}`}
                      fill
                      sizes="91px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-hairline/30 p-2">
                      <span className="text-center font-admin text-[7px] uppercase tracking-wide text-stone leading-tight">
                        Issue {issue.issueNumber}
                      </span>
                    </div>
                  )}
                </div>
                {issue.issueNumber ? (
                  <p className="mt-1 text-center font-admin text-[8px] uppercase tracking-wide text-stone/50 group-hover:text-ink transition-colors">
                    #{issue.issueNumber}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
