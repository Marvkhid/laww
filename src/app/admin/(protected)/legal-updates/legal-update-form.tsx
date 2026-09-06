"use client";

import { useActionState, useState } from "react";
import type { LegalUpdateRow, PracticeAreaRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/legal-updates/actions";
import { TiptapEditor } from "@/app/admin/(protected)/articles/tiptap-editor";
import type { JSONContent } from "@tiptap/core";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

function ImageUploadField({
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

  return (
    <div className="grid grid-cols-[1fr_140px] gap-3 border-t border-hairline/60 pt-3">
      <div>
        <label htmlFor={fileKey} className="text-[11px] font-semibold uppercase tracking-wide text-ink">
          Image {num}
        </label>
        {preview ? (
          <div className="mt-1 aspect-[16/10] w-full max-w-[200px] overflow-hidden border border-hairline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={`Preview ${num}`} className="h-auto max-h-40 w-full object-contain" />
          </div>
        ) : null}
        <input
          id={fileKey}
          name={fileKey}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
          }}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-3 py-2 text-xs text-ink"
        />
        <input type="hidden" name={existingKey} value={existingUrl ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <label htmlFor={altKey} className="text-[11px] font-semibold uppercase tracking-wide text-ink">
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
          <label htmlFor={posKey} className="text-[11px] font-semibold uppercase tracking-wide text-ink">
            Position
          </label>
          <select
            id={posKey}
            name={posKey}
            defaultValue={existingPosition ?? (num === 1 ? "top-right" : num === 2 ? "bottom-left" : num === 3 ? "center-right" : "center-left")}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-3 py-2 text-xs text-ink"
          >
            <option value="top-right">Top / Right</option>
            <option value="top-left">Top / Left</option>
            <option value="bottom-right">Bottom / Right</option>
            <option value="bottom-left">Bottom / Left</option>
            <option value="center-right">Centre / Right</option>
            <option value="center-left">Centre / Left</option>
            <option value="full-width">Full Width</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export function LegalUpdateForm({
  action,
  initial,
  practiceAreas,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<
    LegalUpdateRow,
    "headline" | "slug" | "summary" | "source_name" | "body" | "cover_image_url"
    | "image_1_url" | "image_1_alt" | "image_1_position"
    | "image_2_url" | "image_2_alt" | "image_2_position"
    | "image_3_url" | "image_3_alt" | "image_3_position"
    | "image_4_url" | "image_4_alt" | "image_4_position"
    | "practice_area_id" | "status"
  >;
  practiceAreas: PracticeAreaRow[];
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [coverPreview, setCoverPreview] = useState<string | null>(initial?.cover_image_url ?? null);

  const initialBody: JSONContent | null =
    initial?.body && typeof initial.body === "object" ? (initial.body as JSONContent) : null;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div>
        <label htmlFor="headline" className="text-sm font-semibold text-ink">
          Headline
        </label>
        <input
          id="headline"
          name="headline"
          type="text"
          required
          defaultValue={initial?.headline}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="slug" className="text-sm font-semibold text-ink">
          Slug <span className="text-[#666]">(auto-generated if empty)</span>
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          defaultValue={initial?.slug}
          placeholder="auto-generated-from-headline"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="summary" className="text-sm font-semibold text-ink">
          Summary <span className="text-[#666]">(optional)</span>
        </label>
        <textarea
          id="summary"
          name="summary"
          rows={3}
          defaultValue={initial?.summary ?? ""}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="source_name" className="text-sm font-semibold text-ink">
          Source name
        </label>
        <input
          id="source_name"
          name="source_name"
          type="text"
          required
          defaultValue={initial?.source_name}
          placeholder="e.g. CityLawyerMag"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
        />
      </div>

      {/* Cover Image */}
      <div>
        <label className="text-sm font-semibold text-ink">
          Cover Image <span className="text-[#666]">(optional)</span>
        </label>
        {coverPreview ? (
          <div className="mt-2 aspect-[16/9] w-full max-w-sm overflow-hidden border border-hairline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview} alt="Cover preview" className="h-auto max-h-56 w-full object-contain" />
          </div>
        ) : null}
        <input
          id="cover_image_file"
          name="cover_image_file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setCoverPreview(URL.createObjectURL(file));
          }}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
        />
        <input type="hidden" name="existing_cover_image_url" value={initial?.cover_image_url ?? ""} />
        <p className="mt-1 text-xs text-[#666]">
          JPEG, PNG, WEBP, or GIF, up to 5MB.
          {initial?.cover_image_url ? " Leave empty to keep the current image." : ""}
        </p>
      </div>

      {/* Inline Article Images */}
      <fieldset className="flex flex-col gap-4 border border-hairline p-4">
        <legend className="text-sm font-semibold text-ink">
          Article Images <span className="text-[#666]">(optional, up to 4)</span>
        </legend>
        <p className="text-xs text-[#666]">
          Position images within the article content. They will be distributed editorially
          through the text, matching the layout used by regular articles.
        </p>
        <ImageUploadField
          num={1}
          fileKey="image_1_file"
          existingKey="existing_image_1_url"
          altKey="image_1_alt"
          posKey="image_1_position"
          existingUrl={initial?.image_1_url}
          existingAlt={initial?.image_1_alt}
          existingPosition={initial?.image_1_position}
        />
        <ImageUploadField
          num={2}
          fileKey="image_2_file"
          existingKey="existing_image_2_url"
          altKey="image_2_alt"
          posKey="image_2_position"
          existingUrl={initial?.image_2_url}
          existingAlt={initial?.image_2_alt}
          existingPosition={initial?.image_2_position}
        />
        <ImageUploadField
          num={3}
          fileKey="image_3_file"
          existingKey="existing_image_3_url"
          altKey="image_3_alt"
          posKey="image_3_position"
          existingUrl={initial?.image_3_url}
          existingAlt={initial?.image_3_alt}
          existingPosition={initial?.image_3_position}
        />
        <ImageUploadField
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

      {/* Full Content */}
      <div>
        <label className="text-sm font-semibold text-ink">Full Content</label>
        <div className="mt-1">
          <TiptapEditor name="body" initialContent={initialBody} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="practice_area_id" className="text-sm font-semibold text-ink">
            Practice area <span className="text-[#666]">(optional)</span>
          </label>
          <select
            id="practice_area_id"
            name="practice_area_id"
            defaultValue={initial?.practice_area_id ?? ""}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 text-sm text-ink"
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
          <label htmlFor="status" className="text-sm font-semibold text-ink">
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
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {state.error ? <p className="text-sm text-digest-red">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit bg-digest-red px-6 py-3 text-sm uppercase tracking-wide text-paper disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
