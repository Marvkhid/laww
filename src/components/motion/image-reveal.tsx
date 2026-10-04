"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EDITORIAL_EASE } from "@/components/motion/reveal";
import {
  REVEAL_ATTRIBUTE,
  REVEAL_STATIC_ATTRIBUTE,
  useCanAnimateReveal,
} from "@/components/motion/reveal-support";

/**
 * ImageReveal — editorial image entrance: fades in while settling from a
 * very slight zoom. GPU-friendly (opacity/transform), runs once on mount
 * for above-the-fold use, or on scroll with `whileInView`.
 */
export function ImageReveal({
  children,
  className,
  delay = 0,
  onScroll = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  onScroll?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const canAnimate = useCanAnimateReveal(reduceMotion);

  if (!canAnimate) {
    // Visible, not animated — a lazy editorial image must never be stranded
    // at opacity: 0 because the reveal could not run.
    return (
      <div
        className={className}
        {...REVEAL_ATTRIBUTE}
        {...REVEAL_STATIC_ATTRIBUTE}
      >
        {children}
      </div>
    );
  }

  const animation = onScroll
    ? { whileInView: { opacity: 1, scale: 1 }, viewport: { once: true, margin: "-60px" } }
    : { animate: { opacity: 1, scale: 1 } };

  return (
    <motion.div
      className={className}
      {...REVEAL_ATTRIBUTE}
      initial={{ opacity: 0, scale: 1.03 }}
      {...animation}
      transition={{ duration: 0.9, delay, ease: EDITORIAL_EASE }}
    >
      {children}
    </motion.div>
  );
}
