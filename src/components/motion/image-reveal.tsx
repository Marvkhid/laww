"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EDITORIAL_EASE } from "@/components/motion/reveal";

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

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const animation = onScroll
    ? { whileInView: { opacity: 1, scale: 1 }, viewport: { once: true, margin: "-60px" } }
    : { animate: { opacity: 1, scale: 1 } };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 1.03 }}
      {...animation}
      transition={{ duration: 0.9, delay, ease: EDITORIAL_EASE }}
    >
      {children}
    </motion.div>
  );
}
