"use client";

import { useState, useTransition } from "react";
import { subscribeToNewsletterAction } from "@/components/forms/newsletter-actions";
import {
  NEWSLETTER_IDLE_STATE,
  type NewsletterFormState,
} from "@/components/forms/newsletter-types";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<NewsletterFormState>(NEWSLETTER_IDLE_STATE);
  const [isPending, startTransition] = useTransition();

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
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          disabled={isPending}
          className="w-full border border-hairline bg-white px-4 py-3 font-admin text-sm text-ink placeholder:text-stone disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isPending}
          className="whitespace-nowrap bg-purple px-6 py-3 font-admin text-sm uppercase tracking-wide text-paper transition-colors hover:bg-purple-deep disabled:opacity-60"
        >
          {isPending ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {state.message ? (
        <p
          role="status"
          className={`mt-2 font-admin text-xs ${
            state.status === "error" ? "text-digest-red" : "text-stone"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
