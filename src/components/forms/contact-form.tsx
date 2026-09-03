"use client";

import { useActionState } from "react";
import { sendContactMessage, type ContactFormState } from "@/app/contact/actions";

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

  const inputClass =
    "w-full border border-hairline bg-white px-4 py-3 font-admin text-sm text-ink placeholder:text-stone/75 focus:border-digest-red focus:outline-none transition-colors";

  return (
    <div>
      {state.status === "success" ? (
        <div className="border border-digest-red/20 bg-digest-red/5 p-6">
          <p className="font-admin text-sm font-medium text-digest-red">Message sent</p>
          <p className="mt-2 font-body text-sm text-stone">{state.message}</p>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="font-utility text-xs uppercase tracking-wide text-stone">
                Name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Your full name"
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="font-utility text-xs uppercase tracking-wide text-stone">
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-category" className="font-utility text-xs uppercase tracking-wide text-stone">
              Category
            </label>
            <select
              id="contact-category"
              name="category"
              className={`mt-1 ${inputClass}`}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="contact-subject" className="font-utility text-xs uppercase tracking-wide text-stone">
              Subject
            </label>
            <input
              id="contact-subject"
              name="subject"
              type="text"
              required
              placeholder="What is this about?"
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <div>
            <label htmlFor="contact-message" className="font-utility text-xs uppercase tracking-wide text-stone">
              Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={6}
              required
              placeholder="Your message..."
              className={`mt-1 ${inputClass} resize-y`}
            />
          </div>

          {state.status === "error" ? (
            <p className="font-admin text-sm text-digest-red">{state.message}</p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="w-fit bg-digest-red px-8 py-3 font-admin text-sm font-semibold uppercase tracking-wide text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Send Message"}
          </button>
        </form>
      )}
    </div>
  );
}
