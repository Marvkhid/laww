"use client";

import { useActionState, useState } from "react";
import type { LawyerQAPair } from "@/lib/supabase/types";
import type { FormState } from "./actions";

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
  fileKey,
  existingKey,
  altKey,
  posKey,
  existingUrl,
  existingAlt,
  existingPosition,
}: {
  num: number;
  fileKey: string;
  existingKey: string;
  altKey: string;
  posKey: string;
  existingUrl?: string | null;
  existingAlt?: string | null;
  existingPosition?: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null);
  const [removed, setRemoved] = useState(false);

  return (
    <div className="grid grid-cols-[1fr_160px] gap-3 border-t border-hairline/60 pt-3">
      <div>
        <label htmlFor={fileKey} className="block text-[12px] font-semibold text-ink">
          Image {num}
        </label>
        {preview && !removed ? (
          <div className="mt-1 w-full max-w-[220px] border border-hairline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`Preview ${num}`}
              className="h-auto max-h-40 w-full object-contain"
            />
          </div>
        ) : null}
        <input
          id={fileKey}
          name={fileKey}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              setPreview(URL.createObjectURL(file));
              setRemoved(false);
            }
          }}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-3 py-2 text-xs text-ink"
        />
        <input type="hidden" name={existingKey} value={removed ? "" : (existingUrl ?? "")} />
        {preview && !removed ? (
          <button
            type="button"
            onClick={() => {
              setRemoved(true);
              setPreview(null);
            }}
            className="mt-1 text-xs font-semibold text-digest-red hover:text-digest-red-deep"
          >
            Remove image
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <label htmlFor={altKey} className="block text-[12px] font-semibold text-ink">
            Alt text
          </label>
          <input
            id={altKey}
            name={altKey}
            type="text"
            defaultValue={existingAlt ?? ""}
            placeholder="Image description"
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-3 py-2 text-xs text-ink"
          />
        </div>
        <div>
          <label htmlFor={posKey} className="block text-[12px] font-semibold text-ink">
            Position
          </label>
          <select
            id={posKey}
            name={posKey}
            defaultValue={existingPosition ?? DEFAULT_POSITIONS[num]}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-3 py-2 text-xs text-ink"
          >
            {POSITIONS.map((pos) => (
              <option key={pos.value} value={pos.value}>
                {pos.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
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
      {/* ── Basics ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lawyer_name" className="block text-sm font-semibold text-ink">
            Lawyer name <span className="text-digest-red">*</span>
          </label>
          <input
            id="lawyer_name"
            name="lawyer_name"
            type="text"
            required
            defaultValue={initial?.lawyer_name ?? ""}
            placeholder="e.g. Chief Afe Babalola (SAN)"
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
          />
        </div>
        <div>
          <label htmlFor="lawyer_title" className="block text-sm font-semibold text-ink">
            Title / Role <span className="text-[#666]">(optional)</span>
          </label>
          <input
            id="lawyer_title"
            name="lawyer_title"
            type="text"
            defaultValue={initial?.lawyer_title ?? ""}
            placeholder="e.g. Senior Advocate of Nigeria"
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
          />
        </div>
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-semibold text-ink">
          Slug <span className="text-[#666]">(auto-generated from name if empty)</span>
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          defaultValue={initial?.slug ?? ""}
          placeholder="auto-generated-from-name"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
        />
      </div>

      <div>
        <label htmlFor="intro" className="block text-sm font-semibold text-ink">
          Introduction <span className="text-[#666]">(optional)</span>
        </label>
        <textarea
          id="intro"
          name="intro"
          rows={3}
          defaultValue={initial?.intro ?? ""}
          placeholder="Short editorial introduction to the interview…"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
        />
      </div>

      {/* ── Cover image ────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-ink">
          Cover / featured image <span className="text-[#666]">(optional)</span>
        </label>
        {initial?.cover_image_url ? (
          <div className="mt-2 w-full max-w-sm border border-hairline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={initial.cover_image_url}
              alt="Cover preview"
              className="h-auto w-full object-contain"
            />
          </div>
        ) : null}
        <input
          id="cover_image_file"
          name="cover_image_file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-2 text-sm text-ink"
        />
        <input
          type="hidden"
          name="existing_cover_image_url"
          value={initial?.cover_image_url ?? ""}
        />
        <label htmlFor="cover_image_alt" className="mt-2 block text-[12px] font-semibold text-ink">
          Cover alt text
        </label>
        <input
          id="cover_image_alt"
          name="cover_image_alt"
          type="text"
          defaultValue={initial?.cover_image_alt ?? ""}
          placeholder="Describe the photo"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-2 text-sm text-ink"
        />
      </div>

      {/* ── Inline images (1–4) ────────────────────────────────── */}
      <fieldset className="border border-hairline p-4">
        <legend className="px-1 text-sm font-semibold text-ink">
          Inline images <span className="text-[#666]">(optional, up to 4)</span>
        </legend>
        <p className="mb-3 text-xs text-[#666]">
          Distributed editorially through the interview text — same behavioural layout as
          articles. Uploaded images are never cropped.
        </p>
        <InlineImageField
          num={1}
          fileKey="image_1_file"
          existingKey="existing_image_1_url"
          altKey="image_1_alt"
          posKey="image_1_position"
          existingUrl={initial?.image_1_url}
          existingAlt={initial?.image_1_alt}
          existingPosition={initial?.image_1_position}
        />
        <InlineImageField
          num={2}
          fileKey="image_2_file"
          existingKey="existing_image_2_url"
          altKey="image_2_alt"
          posKey="image_2_position"
          existingUrl={initial?.image_2_url}
          existingAlt={initial?.image_2_alt}
          existingPosition={initial?.image_2_position}
        />
        <InlineImageField
          num={3}
          fileKey="image_3_file"
          existingKey="existing_image_3_url"
          altKey="image_3_alt"
          posKey="image_3_position"
          existingUrl={initial?.image_3_url}
          existingAlt={initial?.image_3_alt}
          existingPosition={initial?.image_3_position}
        />
        <InlineImageField
          num={4}
          fileKey="image_4_file"
          existingKey="existing_image_4_url"
          altKey="image_4_alt"
          posKey="image_4_position"
          existingUrl={initial?.image_4_url}
          existingAlt={initial?.image_4_alt}
          existingPosition={initial?.image_4_position}
        />
      </fieldset>

      {/* ── Q&A builder ────────────────────────────────────────── */}
      <fieldset className="border border-hairline p-4">
        <legend className="px-1 text-sm font-semibold text-ink">
          Question &amp; Answer pairs
        </legend>
        <p className="mb-3 text-xs text-[#666]">
          Choose how many Q&amp;A pairs you need — fields appear immediately. Remove any
          pair you don&rsquo;t want.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label htmlFor="qa_count" className="text-sm font-semibold text-ink">
            Number of Q&amp;A pairs:
          </label>
          <select
            id="qa_count"
            value={qaCount}
            onChange={(event) => setQaCountWithFlags(Number(event.target.value))}
            className="border border-[#c8c3bb] bg-white px-3 py-2 text-sm text-ink"
          >
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-xs text-[#666]">
            The first 3 show on the homepage; readers click through for all of them.
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {Array.from({ length: qaCount }, (_, i) => {
            const existing = existingQa[i];
            const isRemoved = removeFlags[i] ?? false;
            return (
              <div
                key={i}
                className={`rounded-sm border p-3 ${
                  isRemoved ? "border-hairline bg-hairline/30 opacity-50" : "border-hairline bg-white"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-ink">
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
                    className="text-xs font-semibold text-digest-red hover:text-digest-red-deep"
                  >
                    {isRemoved ? "Restore" : "Remove"}
                  </button>
                </div>
                {isRemoved ? (
                  <p className="text-xs text-[#666]">
                    This pair will be deleted when you save.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div>
                      <label htmlFor={`qa_q_${i}`} className="block text-[12px] font-semibold text-ink">
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
                      <label htmlFor={`qa_a_${i}`} className="block text-[12px] font-semibold text-ink">
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
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* ── Status ─────────────────────────────────────────────── */}
      <div>
        <label htmlFor="status" className="block text-sm font-semibold text-ink">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={initial?.status ?? "pending_review"}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
        >
          <option value="pending_review">Pending review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {state.error ? <p className="text-sm font-semibold text-digest-red">{state.error}</p> : null}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="w-fit bg-digest-red px-6 py-3 text-sm font-semibold uppercase tracking-wide text-paper disabled:opacity-60"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        <span className="text-xs text-[#666]">
          {activeCount} active Q&amp;A pair{activeCount === 1 ? "" : "s"}
        </span>
      </div>
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
        className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
      />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
