"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import {
  REVEAL_ATTRIBUTE,
  REVEAL_STATIC_ATTRIBUTE,
  useCanAnimateReveal,
} from "./reveal-support";

// The editorial "settle onto the page" easing used everywhere motion
// appears on this site — a single signature curve rather than a different
// feel per section.
export const EDITORIAL_EASE = [0.16, 1, 0.3, 1] as const;

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const canAnimate = useCanAnimateReveal(reduceMotion);

  if (!canAnimate) {
    // Visible, not animated. Never leave the content at opacity: 0.
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

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: EDITORIAL_EASE }}
      className={className}
      {...REVEAL_ATTRIBUTE}
    >
      {children}
    </motion.div>
  );
}
