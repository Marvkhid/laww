"use client";

import { useActionState } from "react";
import type { CallForPapersRow, PracticeAreaRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/call-for-papers/actions";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function CallForPapersForm({
  action,
  initial,
  initialPracticeAreaIds,
  practiceAreas,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<
    CallForPapersRow,
    "issue_number" | "issue_month" | "deadline" | "word_limit" | "contact_email"
  >;
  initialPracticeAreaIds?: Set<string>;
  practiceAreas: PracticeAreaRow[];
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const selected = initialPracticeAreaIds ?? new Set<string>();

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="issue_number"
            className="font-admin text-xs font-semibold uppercase tracking-wide text-ink"
          >
            Issue number
          </label>
          <input
            id="issue_number"
            name="issue_number"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={initial?.issue_number}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
        <div>
          <label
            htmlFor="word_limit"
            className="font-admin text-xs font-semibold uppercase tracking-wide text-ink"
          >
            Word limit
          </label>
          <input
            id="word_limit"
            name="word_limit"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={initial?.word_limit}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="issue_month"
          className="font-admin text-xs font-semibold uppercase tracking-wide text-ink"
        >
          Issue month
        </label>
        <input
          id="issue_month"
          name="issue_month"
          type="text"
          required
          defaultValue={initial?.issue_month}
          placeholder="e.g. October 2026"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label
          htmlFor="deadline"
          className="font-admin text-xs font-semibold uppercase tracking-wide text-ink"
        >
          Deadline
        </label>
        <input
          id="deadline"
          name="deadline"
          type="date"
          required
          defaultValue={initial?.deadline}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label
          htmlFor="contact_email"
          className="font-admin text-xs font-semibold uppercase tracking-wide text-ink"
        >
          Contact email
        </label>
        <input
          id="contact_email"
          name="contact_email"
          type="email"
          required
          defaultValue={initial?.contact_email}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>

      <fieldset className="flex flex-col gap-2 border border-hairline p-4">
        <legend className="font-admin text-xs font-semibold uppercase tracking-wide text-ink">Topics</legend>
        {practiceAreas.map((area) => (
          <label key={area.id} className="flex items-center gap-2 font-admin text-sm text-ink">
            <input
              type="checkbox"
              name="practice_area_ids"
              value={area.id}
              defaultChecked={selected.has(area.id)}
            />
            {area.name}
          </label>
        ))}
      </fieldset>

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
