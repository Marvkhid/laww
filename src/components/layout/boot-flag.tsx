"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    /** Timer armed by the inline watchdog script in the root layout. */
    __ngRevealWatchdog?: ReturnType<typeof setTimeout>;
  }
}

/**
 * BootFlag — the success half of the reveal watchdog.
 *
 * The root layout ships a tiny inline script that arms a timer: if the client
 * bundle has not booted within a couple of seconds — a stale cached chunk after
 * a deploy, a blocked script, a privacy extension, a hydration exception — it
 * adds `no-hydration` to `<html>` so the CSS safety net in `globals.css`
 * renders every `[data-reveal]` block visibly instead of leaving the page at
 * its animated-in `opacity: 0` forever.
 *
 * This component runs as soon as React has hydrated the root, which is exactly
 * the signal the watchdog is waiting for, so it clears the timer. Mounted in
 * the root layout, before anything that can throw.
 *
 * Deliberately one-directional: if the timer has already fired (slow device or
 * slow network), the class is *not* removed. By then content has been shown
 * without animation; hiding it again to re-run the entrance animation would
 * reintroduce the very flash this guard exists to prevent.
 */
export function BootFlag() {
  useEffect(() => {
    if (window.__ngRevealWatchdog !== undefined) {
      clearTimeout(window.__ngRevealWatchdog);
      window.__ngRevealWatchdog = undefined;
    }
  }, []);

  return null;
}
