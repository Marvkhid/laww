"use client";

import { useActionState } from "react";
import type { CallForPapersRow, PracticeAreaRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/call-for-papers/actions";
import {
  TextField,
  FormSection,
} from "@/components/forms/kit/field";
import { SubmitButton } from "@/components/forms/kit/submit-button";

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
    <form action={formAction} className="flex max-w-lg flex-col gap-5">
      <FormSection title="Call Details" subtitle="Issue targeting and submission rules." accent="top">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Issue number"
            id="issue_number"
            name="issue_number"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={initial?.issue_number}
            index={0}
          />
          <TextField
            label="Word limit"
            id="word_limit"
            name="word_limit"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={initial?.word_limit}
            index={1}
          />
        </div>
        <TextField
          label="Issue month"
          id="issue_month"
          name="issue_month"
          type="text"
          required
          defaultValue={initial?.issue_month}
          placeholder="e.g. October 2026"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Deadline"
            id="deadline"
            name="deadline"
            type="date"
            required
            defaultValue={initial?.deadline}
            index={2}
          />
          <TextField
            label="Contact email"
            id="contact_email"
            name="contact_email"
            type="email"
            required
            defaultValue={initial?.contact_email}
            placeholder="submissions@…"
            index={3}
          />
        </div>
      </FormSection>

      <FormSection title="Topics" subtitle="Practice areas this call accepts submissions for." accent="left">
        <div className="flex flex-col divide-y divide-hairline/60">
          {practiceAreas.map((area) => (
            <label
              key={area.id}
              className="group flex cursor-pointer items-center gap-3 py-2 font-admin text-sm text-ink"
            >
              <input
                type="checkbox"
                name="practice_area_ids"
                value={area.id}
                defaultChecked={selected.has(area.id)}
                className="h-4 w-4 shrink-0 accent-[#A51C30]"
              />
              <span className="transition-colors group-hover:text-digest-red">{area.name}</span>
            </label>
          ))}
        </div>
      </FormSection>

      {state.error ? (
        <p role="alert" className="font-admin text-sm font-medium text-digest-red">
          {state.error}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} pendingLabel="Saving…" isPending={isPending} />
    </form>
  );
}
