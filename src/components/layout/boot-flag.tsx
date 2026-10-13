"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    /** Timer armed by the inline watchdog script in the root layout. */
    __ngRevealWatchdog?: ReturnType<typeof setTimeout>;
    /**
     * Set by that script once it has installed its rescue stylesheet, so a
     * test can observe that the rescue fired without inspecting the DOM the
     * script is deliberately forbidden from touching.
     */
    __ngRevealRescued?: number;
  }
}

/**
 * BootFlag — the success half of the reveal watchdog.
 *
 * The root layout ships a tiny inline script that arms a timer: if the client
 * bundle has not booted within a couple of seconds — a stale cached chunk after
 * a deploy, a blocked script, a privacy extension, a hydration exception — it
 * installs a stylesheet that renders every `[data-reveal]` block visibly
 * instead of leaving the page at its animated-in `opacity: 0` forever. It
 * installs styles rather than rewriting elements so that a *slow* boot, where
 * hydration lands after the timer, still matches what the server rendered.
 *
 * This component runs as soon as React has hydrated the root, which is exactly
 * the signal the watchdog is waiting for, so it clears the timer. Mounted in
 * the root layout, before anything that can throw.
 *
 * Deliberately one-directional: if the timer has already fired (slow device or
 * slow network), the rescue is *not* undone. By then content has been shown
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
