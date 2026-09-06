"use client";

import { useActionState, useState } from "react";
import type { LegalInsightRow } from "@/lib/supabase/types";
import type { FormState } from "./actions";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function InsightForm({
  action,
  initial,
  submitLabel,
  entityId,
}: {
  action: ActionFn;
  initial?: Pick<
    LegalInsightRow,
    | "title"
    | "content"
    | "description"
    | "category"
    | "image_url"
    | "answer_options"
    | "correct_option"
    | "published"
    | "display_order"
  >;
  submitLabel: string;
  entityId?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });

  const existingOptions: string[] = Array.isArray(initial?.answer_options)
    ? initial!.answer_options.filter((opt) => typeof opt === "string")
    : [];

  const [optionCount, setOptionCount] = useState(Math.max(2, existingOptions.length));
  const [optionValues, setOptionValues] = useState<string[]>(() => {
    const base = [...existingOptions];
    while (base.length < Math.max(2, existingOptions.length)) base.push("");
    return base;
  });
  const [correctOption, setCorrectOption] = useState<number | null>(
    typeof initial?.correct_option === "number" ? initial.correct_option : null
  );

  function setCount(next: number) {
    const clamped = Math.max(2, Math.min(6, next));
    setOptionCount(clamped);
    setOptionValues((prev) => {
      const nextVals = [...prev];
      while (nextVals.length < clamped) nextVals.push("");
      return nextVals.slice(0, clamped);
    });
  }

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      {entityId ? <input type="hidden" name="entity_id" value={entityId} /> : null}
      <input type="hidden" name="correct_option" value={correctOption ?? ""} />

      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-ink">
          Question <span className="text-digest-red">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title ?? ""}
          placeholder="e.g. What does 'habeas corpus' literally mean?"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
        />
      </div>

      {/* ── Answer options builder ─────────────────────────────── */}
      <fieldset className="border border-hairline p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Answer options</legend>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label htmlFor="option_count" className="text-sm font-semibold text-ink">
            Number of options:
          </label>
          <select
            id="option_count"
            value={optionCount}
            onChange={(event) => setCount(Number(event.target.value))}
            className="border border-[#c8c3bb] bg-white px-3 py-2 text-sm text-ink"
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-xs text-[#666]">
            Tick the radio next to the correct answer.
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {Array.from({ length: optionCount }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="radio"
                name="correct_option_radio"
                checked={correctOption === i}
                onChange={() => setCorrectOption(i)}
                aria-label={`Mark option ${String.fromCharCode(65 + i)} as correct`}
                className="h-4 w-4 shrink-0 accent-[#A51C30]"
              />
              <input
                type="text"
                name={`option_${i}`}
                value={optionValues[i] ?? ""}
                onChange={(event) =>
                  setOptionValues((prev) => {
                    const next = [...prev];
                    next[i] = event.target.value;
                    return next;
                  })
                }
                placeholder={`Option ${String.fromCharCode(65 + i)} — e.g. ${
                  i === 0 ? "You shall have the body" : "A writ of mandamus"
                }`}
                className="w-full border border-[#c8c3bb] bg-white px-4 py-2.5 text-sm text-ink"
              />
            </div>
          ))}
        </div>
        {correctOption === null ? (
          <p className="mt-3 text-xs font-semibold text-digest-red">
            No correct answer selected yet — readers can&rsquo;t play this question until you
            pick one.
          </p>
        ) : null}
      </fieldset>

      <div>
        <label htmlFor="content" className="block text-sm font-semibold text-ink">
          Explanation <span className="text-[#666]">(shown in the correct-answer reference)</span>
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={4}
          defaultValue={initial?.content ?? ""}
          placeholder="Brief explanation of the correct answer…"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-ink">
          Short Description <span className="text-[#666]">(optional)</span>
        </label>
        <input
          id="description"
          name="description"
          type="text"
          defaultValue={initial?.description ?? ""}
          placeholder="Brief summary for cards"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-semibold text-ink">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={initial?.category ?? "legal_question"}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
          >
            <option value="general">General</option>
            <option value="did_you_know">Did You Know?</option>
            <option value="know_the_law">Know the Law</option>
            <option value="case_of_the_week">Case of the Week</option>
            <option value="legal_question">Legal Question</option>
            <option value="law_in_practice">Law in Practice</option>
          </select>
        </div>
        <div>
          <label htmlFor="display_order" className="block text-sm font-semibold text-ink">
            Display Order
          </label>
          <input
            id="display_order"
            name="display_order"
            type="number"
            min={0}
            step={1}
            defaultValue={initial?.display_order ?? 0}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
          />
        </div>
      </div>

      {/* Image upload */}
      <fieldset className="border border-hairline p-4">
        <legend className="px-1 text-sm font-semibold text-ink">
          Image <span className="text-[#666]">(optional)</span>
        </legend>
        {initial?.image_url ? (
          <div className="mb-3 mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={initial.image_url}
              alt="Current image"
              className="h-auto max-h-40 w-auto max-w-full border border-hairline object-contain"
            />
          </div>
        ) : null}
        <input
          id="image_file"
          name="image_file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="mt-2 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
        />
        <input type="hidden" name="existing_image_url" value={initial?.image_url ?? ""} />
        <p className="mt-1 text-xs text-[#333]">
          JPEG, PNG, WEBP, or GIF, up to 5MB. Leave empty to keep current image.
        </p>
      </fieldset>

      {/* Published toggle */}
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="published"
          defaultChecked={initial?.published ?? true}
          className="h-4 w-4"
        />
        <span className="text-sm font-semibold text-ink">Published</span>
      </label>

      {state.error ? <p className="text-sm font-semibold text-digest-red">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit bg-digest-red px-6 py-3 text-sm font-semibold uppercase tracking-wide text-paper disabled:opacity-60"
      >
        {isPending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
