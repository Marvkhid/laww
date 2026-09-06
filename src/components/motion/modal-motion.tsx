"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EDITORIAL_EASE } from "@/components/motion/reveal";

/**
 * ModalMotion — mount/unmount transition for dialogs and popups.
 * Wrap the conditional overlay; scale+fade with the signature ease.
 * Uses spring physics for a premium, non-linear feel.
 */
export function ModalMotion({
  isOpen,
  children,
  className,
}: {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen ? (
        reduceMotion ? (
          <div className={className}>{children}</div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EDITORIAL_EASE }}
            className={className}
          >
            {children}
          </motion.div>
        )
      ) : null}
    </AnimatePresence>
  );
}

/**
 * ModalPanelMotion — spring pop for the inner panel of a modal.
 */
export function ModalPanelMotion({
  isOpen,
  children,
  className,
}: {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={isOpen ? { opacity: 0, scale: 0.94, y: 16 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
