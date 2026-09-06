"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EDITORIAL_EASE } from "@/components/motion/reveal";

/**
 * Route-level transition: every page's content settles in with the same
 * signature ease. Transform/opacity only — no layout shift, no scroll jump.
 */
export default function Template({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EDITORIAL_EASE }}
    >
      {children}
    </motion.div>
  );
}
