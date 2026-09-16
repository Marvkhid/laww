"use client";

import { useActionState, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import type { LawyerQAPair } from "@/lib/supabase/types";
import type { FormState } from "./actions";
import {
  TextField,
  TextAreaField,
  SelectField,
  FormSection,
  fieldEntrance,
} from "@/components/forms/kit/field";
import { SubmitButton } from "@/components/forms/kit/submit-button";
import { ImageUploadZone } from "@/components/forms/kit/image-upload";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

const POSITIONS = [
  { value: "top-right", label: "Top / Right" },
  { value: "top-left", label: "Top / Left" },
  { value: "bottom-right", label: "Bottom / Right" },
  { value: "bottom-left", label: "Bottom / Left" },
  { value: "center-right", label: "Centre / Right" },
  { value: "center-left", label: "Centre / Left" },
  { value: "full-width", label: "Full Width" },
];

const DEFAULT_POSITIONS: Record<number, string> = {
  1: "top-right",
  2: "bottom-left",
  3: "center-right",
  4: "center-left",
};

function InlineImageField({
  num,
  existingUrl,
  existingAlt,
  existingPosition,
}: {
  num: number;
  existingUrl?: string | null;
  existingAlt?: string | null;
  existingPosition?: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null);
  const [removed, setRemoved] = useState(false);

  return (
    <motion.div {...fieldEntrance} className="grid gap-3 border-t border-hairline/70 pt-4 sm:grid-cols-[1fr_170px]">
      <div>
        <span className="font-admin text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
          Image {num}
        </span>
        <AnimatePresence initial={false}>
          {preview && !removed ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="mt-1.5 w-full max-w-[220px] border border-hairline bg-white"
              style={{ borderRadius: 2 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={`Preview ${num}`} className="h-auto max-h-40 w-full object-contain" />
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="mt-1.5">
          <ImageUploadZone
            name={`image_${num}_file`}
            label={`Image ${num}`}
            compact
            previewAspect="aspect-[16/9]"
            onFilesSelected={(files) => {
              setPreview(URL.createObjectURL(files[0]));
              setRemoved(false);
            }}
          />
        </div>
        <input
          type="hidden"
          name={`existing_image_${num}_url`}
          value={removed ? "" : (existingUrl ?? "")}
        />
        {preview && !removed ? (
          <button
            type="button"
            onClick={() => {
              setRemoved(true);
              setPreview(null);
            }}
            className="mt-1.5 font-admin text-xs font-semibold text-digest-red hover:text-digest-red-deep"
          >
            Remove image
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        <TextField
          label="Alt text"
          id={`image_${num}_alt`}
          name={`image_${num}_alt`}
          type="text"
          defaultValue={existingAlt ?? ""}
          placeholder="Describe the photo"
        />
        <SelectField
          label="Position"
          id={`image_${num}_position`}
          name={`image_${num}_position`}
          defaultValue={existingPosition ?? DEFAULT_POSITIONS[num]}
        >
          {POSITIONS.map((pos) => (
            <option key={pos.value} value={pos.value}>
              {pos.label}
            </option>
          ))}
        </SelectField>
      </div>
    </motion.div>
  );
}

export function LawyerNewsForm({
  action,
  initial,
  submitLabel,
}: {
  action: ActionFn;
  initial?: {
    id?: string;
    slug?: string;
    lawyer_name?: string;
    lawyer_title?: string | null;
    intro?: string | null;
    cover_image_url?: string | null;
    cover_image_alt?: string | null;
    image_1_url?: string | null;
    image_1_alt?: string | null;
    image_1_position?: string | null;
    image_2_url?: string | null;
    image_2_alt?: string | null;
    image_2_position?: string | null;
    image_3_url?: string | null;
    image_3_alt?: string | null;
    image_3_position?: string | null;
    image_4_url?: string | null;
    image_4_alt?: string | null;
    image_4_position?: string | null;
    qa_pairs?: LawyerQAPair[] | null;
    status?: string;
  };
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const reduce = useReducedMotion();

  const existingQa: LawyerQAPair[] = Array.isArray(initial?.qa_pairs)
    ? initial!.qa_pairs!.filter(
        (pair) => pair && typeof pair.question === "string"
      )
    : [];

  // Q&A builder state. `qaCount` drives how many Q&A field rows render.
  const [qaCount, setQaCount] = useState(Math.max(1, existingQa.length));
  const [removeFlags, setRemoveFlags] = useState<boolean[]>(
    existingQa.map(() => false)
  );

  const activeCount = removeFlags.filter((flag) => !flag).length;

  function setQaCountWithFlags(next: number) {
    const clamped = Math.max(1, Math.min(30, next));
    setQaCount(clamped);
    setRemoveFlags((prev) => {
      const nextFlags = [...prev];
      while (nextFlags.length < clamped) nextFlags.push(false);
      return nextFlags.slice(0, clamped);
    });
  }

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-5">
      {/* ── Basics ── */}
      <FormSection title="Interview" subtitle="Who is being featured." accent="top">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Lawyer name"
            id="lawyer_name"
            name="lawyer_name"
            type="text"
            required
            defaultValue={initial?.lawyer_name ?? ""}
            placeholder="e.g. Chief Afe Babalola (SAN)"
            index={0}
          />
          <TextField
            label="Title / Role"
            optional
            id="lawyer_title"
            name="lawyer_title"
            type="text"
            defaultValue={initial?.lawyer_title ?? ""}
            placeholder="e.g. Senior Advocate of Nigeria"
            index={1}
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="slug" className="font-admin text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
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
                className="mt-1.5 w-full cursor-not-allowed border border-hairline bg-hairline/20 px-4 py-3 font-admin text-sm text-stone"
                style={{ borderRadius: 2 }}
              />
              <input type="hidden" name="slug" value={initial.slug} />
              <p className="mt-1.5 font-admin text-xs text-stone">
                Existing slug — preserved to keep the public URL stable.
              </p>
            </>
          ) : (
            <>
              <input
                id="slug"
                name="slug"
                type="text"
                placeholder="auto-generated-from-name"
                className="mt-1.5 w-full border border-hairline bg-white px-4 py-3 font-admin text-sm text-ink"
                style={{ borderRadius: 2 }}
              />
              <p className="mt-1.5 font-admin text-xs text-stone">
                Auto-generated from the lawyer name if left empty.
              </p>
            </>
          )}
        </div>

        <TextAreaField
          label="Introduction"
          optional
          id="intro"
          name="intro"
          rows={3}
          defaultValue={initial?.intro ?? ""}
          placeholder="Short editorial introduction to the interview…"
        />
      </FormSection>

      {/* ── Cover image ── */}
      <FormSection title="Cover / Featured Image" subtitle="The hero photo for this feature." accent="left">
        <ImageUploadZone
          name="cover_image_file"
          label={initial?.cover_image_url ? "Replace cover image" : "Upload cover image"}
          existingHiddenName="existing_cover_image_url"
          existingValue={initial?.cover_image_url ?? ""}
          previewAspect="aspect-[16/9]"
        />
        <TextField
          label="Cover alt text"
          id="cover_image_alt"
          name="cover_image_alt"
          type="text"
          defaultValue={initial?.cover_image_alt ?? ""}
          placeholder="Describe the photo"
        />
      </FormSection>

      {/* ── Inline images ── */}
      <FormSection
        title="Inline Images"
        subtitle="Distributed editorially through the interview text — up to 4. Uploaded images are never cropped."
        accent="left"
      >
        <InlineImageField
          num={1}
          existingUrl={initial?.image_1_url}
          existingAlt={initial?.image_1_alt}
          existingPosition={initial?.image_1_position}
        />
        <InlineImageField
          num={2}
          existingUrl={initial?.image_2_url}
          existingAlt={initial?.image_2_alt}
          existingPosition={initial?.image_2_position}
        />
        <InlineImageField
          num={3}
          existingUrl={initial?.image_3_url}
          existingAlt={initial?.image_3_alt}
          existingPosition={initial?.image_3_position}
        />
        <InlineImageField
          num={4}
          existingUrl={initial?.image_4_url}
          existingAlt={initial?.image_4_alt}
          existingPosition={initial?.image_4_position}
        />
      </FormSection>

      {/* ── Q&A builder ── */}
      <FormSection
        title="Question & Answer Pairs"
        subtitle="Choose how many pairs you need — fields appear immediately. The first 3 show on the homepage; readers click through for all of them."
        accent="left"
      >
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="qa_count" className="font-admin text-sm font-semibold text-ink">
            Number of Q&amp;A pairs:
          </label>
          <select
            id="qa_count"
            value={qaCount}
            onChange={(event) => setQaCountWithFlags(Number(event.target.value))}
            className="border border-hairline bg-white px-3 py-2 font-admin text-sm text-ink"
            style={{ borderRadius: 2 }}
          >
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {Array.from({ length: qaCount }, (_, i) => {
              const existing = existingQa[i];
              const isRemoved = removeFlags[i] ?? false;
              return (
                <motion.div
                  key={i}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 28 }}
                  className={`border p-4 ${
                    isRemoved ? "border-hairline bg-hairline/30 opacity-50" : "border-hairline bg-white"
                  }`}
                  style={{ borderRadius: 2 }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-admin text-[11px] font-bold uppercase tracking-[0.12em] text-ink">
                      Q&amp;A {i + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setRemoveFlags((prev) => {
                          const next = [...prev];
                          next[i] = !next[i];
                          return next;
                        })
                      }
                      className="font-admin text-xs font-semibold text-digest-red hover:text-digest-red-deep"
                    >
                      {isRemoved ? "Restore" : "Remove"}
                    </button>
                  </div>
                  {isRemoved ? (
                    <p className="font-admin text-xs text-stone">
                      This pair will be deleted when you save.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label htmlFor={`qa_q_${i}`} className="font-admin text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
                          Question {i + 1}
                        </label>
                        <QaTextarea
                          id={`qa_q_${i}`}
                          name={`qa_question_${i}`}
                          initialValue={existing?.question ?? ""}
                          placeholder="e.g. What inspired you to pursue law?"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label htmlFor={`qa_a_${i}`} className="font-admin text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
                          Answer {i + 1}
                        </label>
                        <QaTextarea
                          id={`qa_a_${i}`}
                          name={`qa_answer_${i}`}
                          initialValue={existing?.answer ?? ""}
                          placeholder="The lawyer's full answer…"
                          rows={4}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </FormSection>

      {/* ── Status ── */}
      <FormSection title="Status" accent="left">
        <SelectField
          label="Status"
          id="status"
          name="status"
          defaultValue={initial?.status ?? "pending_review"}
        >
          <option value="pending_review">Pending review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </SelectField>
        <p className="font-admin text-xs text-stone">
          {activeCount} active Q&amp;A pair{activeCount === 1 ? "" : "s"}
        </p>
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

/**
 * Uncontrolled textarea that keeps its live value in a same-named hidden
 * input, so the server action always receives the current text even though
 * removed pairs blank theirs out.
 */
function QaTextarea({
  id,
  name,
  initialValue,
  placeholder,
  rows,
}: {
  id: string;
  name: string;
  initialValue: string;
  placeholder: string;
  rows: number;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        className="mt-1.5 w-full border border-hairline bg-white px-4 py-3 font-admin text-sm text-ink"
        style={{ borderRadius: 2 }}
      />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
