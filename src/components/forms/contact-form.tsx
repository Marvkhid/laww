"use client";

import { useActionState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { sendContactMessage, type ContactFormState } from "@/app/contact/actions";
import {
  TextField,
  TextAreaField,
  SelectField,
  FormSection,
} from "@/components/forms/kit/field";
import { SubmitButton } from "@/components/forms/kit/submit-button";

const CATEGORIES = [
  "General Enquiry",
  "Editorial",
  "Article / Correction",
  "Advertising / Partnership",
  "Subscriptions",
  "Press / Media",
];

const INITIAL_STATE: ContactFormState = { status: "idle", message: "" };

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(sendContactMessage, INITIAL_STATE);
  const reduce = useReducedMotion();

  if (state.status === "success") {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 24 }}
        className="relative border border-digest-red/25 bg-white p-7"
        style={{ borderRadius: 2 }}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-digest-red" />
        <motion.span
          initial={reduce ? false : { scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
          className="mb-3 inline-flex text-digest-red"
        >
          <CheckCircle2 size={28} strokeWidth={1.75} />
        </motion.span>
        <p className="font-admin text-sm font-bold uppercase tracking-[0.1em] text-digest-red">
          Message sent
        </p>
        <p className="mt-2 font-body text-sm text-stone">{state.message}</p>
      </motion.div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormSection title="Your Details" subtitle="So we know who's writing and how to reply." accent="top">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your full name"
            index={0}
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            index={1}
          />
        </div>
        <SelectField label="Category" name="category" defaultValue="">
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </SelectField>
        <TextField
          label="Subject"
          name="subject"
          type="text"
          required
          placeholder="What is this about?"
        />
        <TextAreaField
          label="Message"
          name="message"
          rows={6}
          required
          placeholder="Tell us how we can help…"
        />
      </FormSection>

      <AnimatePresence>
        {state.status === "error" ? (
          <motion.p
            role="alert"
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 font-admin text-sm font-medium text-digest-red"
          >
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-digest-red" />
            {state.message}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <SubmitButton
        label="Send Message"
        pendingLabel="Sending…"
        isPending={isPending}
      />
    </form>
  );
}
