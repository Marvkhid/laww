"use client";

import { useState, useTransition } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import { subscribeToNewsletterAction } from "@/components/forms/newsletter-actions";
import {
  NEWSLETTER_IDLE_STATE,
  type NewsletterFormState,
} from "@/components/forms/newsletter-types";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<NewsletterFormState>(NEWSLETTER_IDLE_STATE);
  const [isPending, startTransition] = useTransition();
  const [focused, setFocused] = useState(false);
  const reduce = useReducedMotion();

  return (
    <div>
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData();
          formData.set("email", email);
          startTransition(async () => {
            const result = await subscribeToNewsletterAction(NEWSLETTER_IDLE_STATE, formData);
            setState(result);
            if (result.status === "success" || result.status === "already_subscribed") {
              setEmail("");
            }
          });
        }}
      >
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <motion.div
          className="flex-1"
          animate={
            reduce
              ? undefined
              : {
                  boxShadow: focused
                    ? "0 0 0 3px rgba(243,240,234,0.18), 0 0 24px -6px rgba(243,240,234,0.4)"
                    : "0 0 0 0 rgba(243,240,234,0)",
                }
          }
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 28 }}
          style={{ borderRadius: 2 }}
        >
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="you@example.com"
            disabled={isPending}
            className="w-full border border-white/20 bg-white/10 px-4 py-3 font-admin text-sm text-paper placeholder:text-white/70 focus:outline-none disabled:opacity-60"
            style={{ borderRadius: 2 }}
          />
        </motion.div>
        <motion.button
          type="submit"
          disabled={isPending}
          whileHover={reduce || isPending ? undefined : { y: -1 }}
          whileTap={reduce || isPending ? undefined : { y: 0, scale: 0.985 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 24 }}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-paper px-6 py-3 font-display text-sm font-bold uppercase tracking-[0.12em] text-ink disabled:opacity-60"
          style={{ borderRadius: 2 }}
        >
          {isPending ? (
            <>
              <motion.span
                animate={reduce ? undefined : { rotate: 360 }}
                transition={reduce ? undefined : { duration: 0.9, repeat: Infinity, ease: "linear" }}
                className="inline-flex"
              >
                <Loader2 size={15} strokeWidth={2.5} />
              </motion.span>
              Subscribing…
            </>
          ) : (
            "Subscribe"
          )}
        </motion.button>
      </form>
      <AnimatePresence>
        {state.message ? (
          <motion.p
            role="status"
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`mt-2 font-admin text-xs ${
              state.status === "error" ? "text-white" : "text-white/70"
            }`}
          >
            {state.message}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
