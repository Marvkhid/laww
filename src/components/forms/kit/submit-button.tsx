"use client";

import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { Loader2, Check } from "lucide-react";

export function SubmitButton({
  label,
  pendingLabel = "Saving…",
  successLabel = "Saved",
  isPending,
  succeeded,
  className = "",
  fullWidth = false,
}: {
  label: string;
  pendingLabel?: string;
  successLabel?: string;
  isPending: boolean;
  succeeded?: boolean;
  className?: string;
  fullWidth?: boolean;
}) {
  const reduce = useReducedMotion();
  // Derived (not effect-driven): shows the success state only while the
  // parent keeps `succeeded` true, and never while a new save is running.
  const showSuccess = succeeded === true && !isPending;

  return (
    <motion.button
      type="submit"
      disabled={isPending}
      whileHover={reduce || isPending ? undefined : { y: -1 }}
      whileTap={reduce || isPending ? undefined : { y: 0, scale: 0.985 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 24 }}
      className={`relative inline-flex items-center justify-center gap-2.5 overflow-hidden px-7 py-3 font-admin text-sm font-semibold uppercase tracking-[0.1em] text-paper disabled:cursor-not-allowed disabled:opacity-70 ${fullWidth ? "w-full" : "w-fit"} ${className}`}
      style={{
        backgroundColor: showSuccess ? "#1e7d3c" : "var(--color-digest-red)",
        borderRadius: 2,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isPending ? (
          <motion.span
            key="pending"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="inline-flex items-center gap-2"
          >
            <motion.span
              animate={reduce ? undefined : { rotate: 360 }}
              transition={reduce ? undefined : { duration: 0.9, repeat: Infinity, ease: "linear" }}
              className="inline-flex"
            >
              <Loader2 size={15} strokeWidth={2.5} />
            </motion.span>
            {pendingLabel}
          </motion.span>
        ) : showSuccess ? (
          <motion.span
            key="success"
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 22 }}
            className="inline-flex items-center gap-2"
          >
            <Check size={15} strokeWidth={3} />
            {successLabel}
          </motion.span>
        ) : (
          <motion.span
            key="label"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
