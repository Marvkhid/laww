"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EDITORIAL_EASE } from "@/components/motion/reveal";
import {
  REVEAL_ATTRIBUTE,
  REVEAL_STATIC_ATTRIBUTE,
  useCanAnimateReveal,
} from "@/components/motion/reveal-support";

export default function Template({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const canAnimate = useCanAnimateReveal(reduceMotion);

  if (!canAnimate) {
    return (
      <div {...REVEAL_ATTRIBUTE} {...REVEAL_STATIC_ATTRIBUTE}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      {...REVEAL_ATTRIBUTE}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EDITORIAL_EASE }}
    >
      {children}
    </motion.div>
  );
}
