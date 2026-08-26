"use client";

import { useActionState } from "react";
import type { LegalUpdateRow, PracticeAreaRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/legal-updates/actions";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function LegalUpdateForm({
  action,
  initial,
  practiceAreas,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<
    LegalUpdateRow,
    "headline" | "summary" | "source_name" | "source_url" | "practice_area_id" | "status"
  >;
  practiceAreas: PracticeAreaRow[];
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div>
        <label htmlFor="headline" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Headline
        </label>
        <input
          id="headline"
          name="headline"
          type="text"
          required
          defaultValue={initial?.headline}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="summary" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Summary <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <textarea
          id="summary"
          name="summary"
          rows={3}
          defaultValue={initial?.summary ?? ""}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label
          htmlFor="source_name"
          className="font-admin text-xs font-medium uppercase tracking-wide text-ink"
        >
          Source name
        </label>
        <input
          id="source_name"
          name="source_name"
          type="text"
          required
          defaultValue={initial?.source_name}
          placeholder="e.g. CityLawyerMag"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label
          htmlFor="source_url"
          className="font-admin text-xs font-medium uppercase tracking-wide text-ink"
        >
          Source URL
        </label>
        <input
          id="source_url"
          name="source_url"
          type="url"
          required
          defaultValue={initial?.source_url}
          placeholder="https://..."
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="practice_area_id"
            className="font-admin text-xs font-medium uppercase tracking-wide text-ink"
          >
            Practice area <span className="normal-case text-[#333]">(optional)</span>
          </label>
          <select
            id="practice_area_id"
            name="practice_area_id"
            defaultValue={initial?.practice_area_id ?? ""}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          >
            <option value="">None</option>
            {practiceAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "pending_review"}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          >
            <option value="pending_review">Pending review</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
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
