"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from "react";

/* ── Shared motion values ─────────────────────────────────────────────── */

export const fieldEntrance = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
};

const spring = { type: "spring" as const, stiffness: 320, damping: 28 };

/* ── Field — animated wrapper: label, entrance, error, helper text ────── */

export function Field({
  label,
  htmlFor,
  optional,
  error,
  helper,
  children,
  index = 0,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  error?: string | null;
  helper?: string;
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`flex flex-col ${className}`}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      {label ? (
        <label
          htmlFor={htmlFor}
          className="font-admin text-[11px] font-semibold uppercase tracking-[0.12em] text-stone"
        >
          {label}
          {optional ? (
            <span className="ml-1.5 normal-case tracking-normal text-stone/70">(optional)</span>
          ) : null}
        </label>
      ) : null}
      {children}
      {helper && !error ? (
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-1.5 font-admin text-xs text-stone"
        >
          {helper}
        </motion.p>
      ) : null}
      {error ? (
        <motion.p
          role="alert"
          initial={reduce ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={spring}
          className="mt-1.5 flex items-center gap-1.5 font-admin text-xs font-medium text-digest-red"
        >
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-digest-red" />
          {error}
        </motion.p>
      ) : null}
    </motion.div>
  );
}

/* ── useGlow — shared focus state for inputs/textareas/selects ────────── */

export function useGlow() {
  const [focused, setFocused] = useState(false);
  const reduce = useReducedMotion();
  const handlers = {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
  const glow = {
    animate: {
      boxShadow: focused
        ? "0 0 0 3px rgba(165,28,48,0.12), 0 0 24px -6px rgba(165,28,48,0.35)"
        : "0 1px 2px rgba(23,23,23,0.04)",
      borderColor: focused ? "var(--color-digest-red)" : "var(--color-hairline)",
    },
    transition: reduce ? { duration: 0 } : spring,
  };
  return { focused, handlers, glow };
}

/* ── Input ─────────────────────────────────────────────────────────────── */

export function TextField({
  label,
  optional,
  error,
  helper,
  index,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  optional?: boolean;
  error?: string | null;
  helper?: string;
  index?: number;
  className?: string;
}) {
  const id = useId();
  const { handlers, glow } = useGlow();
  return (
    <Field label={label} htmlFor={props.id ?? id} optional={optional} error={error} helper={helper} index={index} className={className}>
      <motion.div
        {...glow}
        className="mt-1.5"
        style={{ borderRadius: 2 }}
      >
        <input
          id={props.id ?? id}
          {...props}
          {...handlers}
          className="w-full border border-hairline bg-white px-4 py-3 font-admin text-sm text-ink placeholder:text-stone/60 focus:outline-none disabled:opacity-60"
          style={{ borderRadius: 2 }}
        />
      </motion.div>
    </Field>
  );
}

/* ── Textarea ──────────────────────────────────────────────────────────── */

export function TextAreaField({
  label,
  optional,
  error,
  helper,
  index,
  className = "",
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
  label: string;
  optional?: boolean;
  error?: string | null;
  helper?: string;
  index?: number;
  className?: string;
}) {
  const id = useId();
  const { handlers, glow } = useGlow();
  return (
    <Field label={label} htmlFor={props.id ?? id} optional={optional} error={error} helper={helper} index={index} className={className}>
      <motion.div
        {...glow}
        className="mt-1.5"
        style={{ borderRadius: 2 }}
      >
        <textarea
          id={props.id ?? id}
          {...props}
          {...handlers}
          className="w-full resize-y border border-hairline bg-white px-4 py-3 font-admin text-sm text-ink placeholder:text-stone/60 focus:outline-none disabled:opacity-60"
          style={{ borderRadius: 2 }}
        />
      </motion.div>
    </Field>
  );
}

/* ── Select ────────────────────────────────────────────────────────────── */

export function SelectField({
  label,
  optional,
  error,
  helper,
  index,
  className = "",
  children,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
  label: string;
  optional?: boolean;
  error?: string | null;
  helper?: string;
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const { handlers, glow } = useGlow();
  return (
    <Field label={label} htmlFor={props.id ?? id} optional={optional} error={error} helper={helper} index={index} className={className}>
      <motion.div
        {...glow}
        className="mt-1.5"
        style={{ borderRadius: 2 }}
      >
        <select
          id={props.id ?? id}
          {...props}
          {...handlers}
          className="w-full appearance-none border border-hairline bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%2356504A%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_0.9rem_center] bg-no-repeat px-4 py-3 pr-10 font-admin text-sm text-ink focus:outline-none disabled:opacity-60"
          style={{ borderRadius: 2 }}
        >
          {children}
        </select>
      </motion.div>
    </Field>
  );
}

/* ── Checkbox — custom animated check ──────────────────────────────────── */

export function CheckboxField({
  label,
  description,
  index,
  name,
  defaultChecked,
}: {
  label: string;
  description?: string;
  index?: number;
  name: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked ?? false);
  const reduce = useReducedMotion();
  return (
    <motion.label
      initial={reduce ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: Math.min((index ?? 0) * 0.04, 0.25), ease: [0.16, 1, 0.3, 1] }}
      className="group flex cursor-pointer items-start gap-3 py-1"
    >
      <motion.span
        whileTap={reduce ? undefined : { scale: 0.85 }}
        className="relative mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center border"
        style={{
          borderRadius: 2,
          borderColor: checked ? "var(--color-digest-red)" : "var(--color-hairline)",
          backgroundColor: checked ? "var(--color-digest-red)" : "#ffffff",
        }}
        transition={reduce ? { duration: 0 } : { duration: 0.15 }}
      >
        <motion.svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          initial={false}
          animate={{ opacity: checked ? 1 : 0, scale: checked ? 1 : 0.4 }}
          transition={reduce ? { duration: 0 } : spring}
        >
          <path d="M2 6.5L4.5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="sr-only"
        />
      </motion.span>
      <span className="flex flex-col">
        <span className="font-admin text-sm font-medium text-ink transition-colors group-hover:text-digest-red">
          {label}
        </span>
        {description ? (
          <span className="font-admin text-xs text-stone">{description}</span>
        ) : null}
      </span>
    </motion.label>
  );
}

/* ── FormSection — premium grouped container ───────────────────────────── */

export function FormSection({
  title,
  subtitle,
  children,
  delay = 0,
  accent = "left",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
  accent?: "left" | "top";
}) {
  const reduce = useReducedMotion();
  return (
    <motion.fieldset
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative border border-hairline bg-paper-warm/60 p-5 sm:p-6"
      style={{ borderRadius: 2 }}
    >
      {/* red accent bar */}
      {accent === "left" ? (
        <span
          aria-hidden
          className="absolute top-0 bottom-0 left-0 w-[3px] bg-digest-red/85"
          style={{ borderRadius: "2px 0 0 2px" }}
        />
      ) : (
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-digest-red/85" />
      )}
      <legend className="sr-only">{title}</legend>
      <div className="mb-4">
        <h3 className="font-admin text-xs font-bold uppercase tracking-[0.14em] text-ink">{title}</h3>
        {subtitle ? <p className="mt-1 font-admin text-xs text-stone">{subtitle}</p> : null}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </motion.fieldset>
  );
}
