"use client";

import { useActionState } from "react";
import type { PracticeAreaRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/practice-areas/actions";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function PracticeAreaForm({
  action,
  initial,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<PracticeAreaRow, "slug" | "name" | "description">;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div>
        <label htmlFor="name" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initial?.name}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="slug" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          defaultValue={initial?.slug}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <p className="mt-1 font-admin text-xs text-[#333]">
          Sets the public URL at /practice-areas/[slug] — edited directly, not generated from
          the name.
        </p>
      </div>
      <div>
        <label
          htmlFor="description"
          className="font-admin text-xs font-medium uppercase tracking-wide text-ink"
        >
          Description <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      {state.error ? <p className="font-admin text-sm text-digest-red">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit bg-digest-red px-6 py-3 font-admin text-sm uppercase tracking-wide text-paper disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
