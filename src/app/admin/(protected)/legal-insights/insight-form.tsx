"use client";

import { useActionState, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import type { LegalInsightRow } from "@/lib/supabase/types";
import type { FormState } from "./actions";
import {
  TextField,
  TextAreaField,
  SelectField,
  FormSection,
} from "@/components/forms/kit/field";
import { SubmitButton } from "@/components/forms/kit/submit-button";
import { ImageUploadZone } from "@/components/forms/kit/image-upload";

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
  const reduce = useReducedMotion();

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
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {entityId ? <input type="hidden" name="entity_id" value={entityId} /> : null}
      <input type="hidden" name="correct_option" value={correctOption ?? ""} />

      <FormSection title="Question" subtitle="The legal question readers will answer." accent="top">
        <TextField
          label="Question"
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title ?? ""}
          placeholder="e.g. What does 'habeas corpus' literally mean?"
          index={0}
        />
      </FormSection>

      <FormSection
        title="Answer Options"
        subtitle="Set the number of options, then tick the radio next to the correct answer."
        accent="left"
      >
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="option_count" className="font-admin text-sm font-semibold text-ink">
            Number of options:
          </label>
          <select
            id="option_count"
            value={optionCount}
            onChange={(event) => setCount(Number(event.target.value))}
            className="border border-hairline bg-white px-3 py-2 font-admin text-sm text-ink"
            style={{ borderRadius: 2 }}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {Array.from({ length: optionCount }, (_, i) => (
              <motion.div
                key={i}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: -8 }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 28 }}
                className="flex items-center gap-3"
              >
                <input
                  type="radio"
                  name="correct_option_radio"
                  checked={correctOption === i}
                  onChange={() => setCorrectOption(i)}
                  aria-label={`Mark option ${String.fromCharCode(65 + i)} as correct`}
                  className="h-4 w-4 shrink-0 accent-[#A51C30]"
                />
                <div className="flex-1">
                  <TextField
                    label=""
                    name={`option_${i}`}
                    type="text"
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
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {correctOption === null ? (
            <motion.p
              role="status"
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 font-admin text-xs font-semibold text-digest-red"
            >
              <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-digest-red" />
              No correct answer selected yet — readers can&rsquo;t play this question until you pick one.
            </motion.p>
          ) : null}
        </AnimatePresence>
      </FormSection>

      <FormSection title="Explanation & Classification" accent="left">
        <TextAreaField
          label="Explanation"
          name="content"
          required
          rows={4}
          defaultValue={initial?.content ?? ""}
          placeholder="Brief explanation of the correct answer…"
        />
        <TextField
          label="Short description"
          optional
          id="description"
          name="description"
          type="text"
          defaultValue={initial?.description ?? ""}
          placeholder="Brief summary for cards"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Category"
            id="category"
            name="category"
            defaultValue={initial?.category ?? "legal_question"}
            index={0}
          >
            <option value="general">General</option>
            <option value="did_you_know">Did You Know?</option>
            <option value="know_the_law">Know the Law</option>
            <option value="case_of_the_week">Case of the Week</option>
            <option value="legal_question">Legal Question</option>
            <option value="law_in_practice">Law in Practice</option>
          </SelectField>
          <TextField
            label="Display order"
            id="display_order"
            name="display_order"
            type="number"
            min={0}
            step={1}
            defaultValue={initial?.display_order ?? 0}
            index={1}
          />
        </div>
      </FormSection>

      <FormSection title="Image" subtitle="Optional illustration for this insight." accent="left">
        <ImageUploadZone
          name="image_file"
          label={initial?.image_url ? "Replace image" : "Upload image"}
          existingHiddenName="existing_image_url"
          existingValue={initial?.image_url ?? ""}
          previewAspect="aspect-[16/9]"
        />
        <p className="font-admin text-xs text-stone">
          JPEG, PNG, WEBP, or GIF, up to 5MB. Leave empty to keep current image.
        </p>
      </FormSection>

      <FormSection title="Visibility" accent="left">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={initial?.published ?? true}
            className="h-4 w-4 accent-[#A51C30]"
          />
          <span className="font-admin text-sm font-medium text-ink">Published</span>
        </label>
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
