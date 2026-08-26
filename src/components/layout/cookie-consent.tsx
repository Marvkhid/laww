"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EDITORIAL_EASE } from "@/components/motion/reveal";

const STORAGE_KEY = "law-digest-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Only show if no choice has been made
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (!existing) setVisible(true);
    } catch {
      // localStorage unavailable — don't show banner
    }
  }, []);

  function handleChoice(choice: "accepted" | "rejected") {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // localStorage unavailable — silently skip
    }
    setVisible(false);
  }

  if (!visible) return null;

  const banner = (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-hairline bg-ink px-6 py-5 shadow-2xl"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl font-body text-sm leading-relaxed text-stone">
          We use essential cookies to ensure the website functions correctly.
          No tracking or advertising cookies are used. Your choice is stored
          locally and is never shared.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => handleChoice("rejected")}
            className="border border-paper/20 px-5 py-2.5 font-admin text-xs uppercase tracking-wide text-paper transition-colors hover:border-paper/50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => handleChoice("accepted")}
            className="bg-digest-red px-5 py-2.5 font-admin text-xs uppercase tracking-wide text-paper transition-opacity hover:opacity-80"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );

  if (reduceMotion) return banner;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 1.5, ease: EDITORIAL_EASE }}
    >
      {banner}
    </motion.div>
  );
}
