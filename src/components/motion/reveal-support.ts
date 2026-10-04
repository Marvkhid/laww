"use client";

import { useSyncExternalStore } from "react";

/**
 * `canAnimateReveal` — is it safe to render content in its hidden start state?
 *
 * `Reveal` and `ImageReveal` deliberately paint their children at `opacity: 0`
 * and rely on motion's `whileInView` (an IntersectionObserver callback) to
 * bring them in. That hidden state is part of the server-rendered HTML, so the
 * whole page depends on the bundle booting and on IntersectionObserver firing.
 *
 * The cases where it can never fire are:
 *   1. the user has `prefers-reduced-motion` (already handled by motion's own
 *      `useReducedMotion`, kept here so both signals live in one place), and
 *   2. the environment has no IntersectionObserver at all.
 *
 * For (2) we must render the visible state, or the section is invisible
 * forever. `useSyncExternalStore` is the right tool: the server snapshot says
 * "animation is possible", the client snapshot reports the truth, and React
 * reconciles them without a hydration warning. The capability never changes
 * during a page's life, so the subscription is a no-op.
 *
 * `scripting: none` is handled separately, in pure CSS, by the `[data-reveal]`
 * rules in `app/globals.css`.
 */
const NO_SUBSCRIBE = () => () => {};
const CLIENT_SNAPSHOT = () => typeof IntersectionObserver !== "undefined";
const SERVER_SNAPSHOT = () => true;

export function useCanAnimateReveal(reducedMotion: boolean | null): boolean {
  const hasIntersectionObserver = useSyncExternalStore(
    NO_SUBSCRIBE,
    CLIENT_SNAPSHOT,
    SERVER_SNAPSHOT
  );

  return hasIntersectionObserver && !reducedMotion;
}

/** Merged onto the animated wrapper so the CSS safety net can identify it. */
export const REVEAL_ATTRIBUTE = { "data-reveal": "" } as const;
export const REVEAL_STATIC_ATTRIBUTE = { "data-reveal-static": "" } as const;
