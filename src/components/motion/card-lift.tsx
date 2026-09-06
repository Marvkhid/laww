"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * CardLift — subtle hover lift + soft brand-red glow shadow.
 * Wraps any card; layout untouched, transform/opacity only (GPU-friendly).
 */
export function CardLift({
  children,
  className,
  glow = true,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={
        glow
          ? { ["--tw-shadow-color" as string]: "rgba(165, 28, 48, 0.18)" }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}
