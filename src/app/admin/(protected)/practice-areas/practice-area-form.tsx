"use client";

import { useActionState, useState, useCallback } from "react";
import type { PracticeAreaRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/practice-areas/actions";
import { slugify } from "@/lib/slugify";

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
  const [slugManualOverride, setSlugManualOverride] = useState(false);

  const onNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!slugManualOverride && !initial?.slug) {
        const slugInput = document.getElementById("slug") as HTMLInputElement | null;
        if (slugInput) slugInput.value = slugify(e.target.value);
      }
    },
    [slugManualOverride, initial?.slug],
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div>
        <label htmlFor="name" className="font-admin text-xs font-semibold uppercase tracking-wide text-ink">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initial?.name}
          onChange={onNameChange}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="slug" className="font-admin text-xs font-semibold uppercase tracking-wide text-ink">
          Slug
        </label>
        {initial?.slug ? (
          <>
            <input
              id="slug"
              name="slug"
              type="text"
              readOnly
              defaultValue={initial.slug}
              className="mt-1 w-full cursor-not-allowed border border-[#c8c3bb] bg-hairline/20 px-4 py-3 font-admin text-sm text-stone"
            />
            <input type="hidden" name="slug" value={initial.slug} />
            <p className="mt-1 font-admin text-xs text-[#333]">
              Existing slug — preserved to keep the public URL stable.
            </p>
          </>
        ) : (
          <>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              placeholder="auto-generated-from-name"
              onChange={() => setSlugManualOverride(true)}
              className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
            />
            <p className="mt-1 font-admin text-xs text-[#333]">
              Auto-generated from the name. Edit manually only if needed.
            </p>
          </>
        )}
      </div>
      <div>
        <label
          htmlFor="description"
          className="font-admin text-xs font-semibold uppercase tracking-wide text-ink"
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
        className="w-fit bg-digest-red px-6 py-3 font-admin text-sm font-semibold uppercase tracking-wide text-paper disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
