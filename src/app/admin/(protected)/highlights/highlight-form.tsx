"use client";

import { useActionState } from "react";
import type { HomepageHighlightRow } from "@/lib/supabase/types";
import type { FormState } from "./actions";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function HighlightForm({
  action,
  initial,
  submitLabel,
  entityId,
}: {
  action: ActionFn;
  initial?: Pick<HomepageHighlightRow, "title" | "content" | "caption" | "category" | "image_url" | "image_position" | "published" | "display_order">;
  submitLabel: string;
  entityId?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-6">
      {entityId ? <input type="hidden" name="entity_id" value={entityId} /> : null}

      {/* Image upload — REQUIRED */}
      <fieldset className="border border-hairline p-4">
        <legend className="font-admin text-xs font-medium uppercase tracking-wide text-ink px-1">
          Image <span className="text-digest-red">*</span>
        </legend>
        {initial?.image_url ? (
          <div className="mt-2 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={initial.image_url}
              alt="Current image"
              className="h-32 w-auto border border-hairline object-contain"
            />
          </div>
        ) : null}
        <input
          id="image_file"
          name="image_file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          required
          className="mt-2 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <input type="hidden" name="existing_image_url" value={initial?.image_url ?? ""} />
        <p className="mt-1 font-admin text-xs text-[#333]">
          JPEG, PNG, WEBP, or GIF, up to 5MB. Leave empty to keep current image.
        </p>
      </fieldset>

      {/* Image Position */}
      <div>
        <label className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Image Position
        </label>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="image_position"
              value="left"
              defaultChecked={(initial?.image_position ?? "left") === "left"}
              className="h-4 w-4"
            />
            <span className="font-admin text-sm text-ink">Image Left</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="image_position"
              value="right"
              defaultChecked={initial?.image_position === "right"}
              className="h-4 w-4"
            />
            <span className="font-admin text-sm text-ink">Image Right</span>
          </label>
        </div>
        <p className="mt-1 font-admin text-xs text-[#333]">
          Controls whether the image appears on the left or right side of the text.
        </p>
      </div>

      {/* Title — OPTIONAL */}
      <div>
        <label htmlFor="title" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Title <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={initial?.title ?? ""}
          placeholder="e.g. The Supreme Court of Nigeria"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>

      {/* Content — OPTIONAL */}
      <div>
        <label htmlFor="content" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Content <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <textarea
          id="content"
          name="content"
          rows={4}
          defaultValue={initial?.content ?? ""}
          placeholder="The highlight content, fact, or editorial note..."
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>

      {/* Caption — OPTIONAL */}
      <div>
        <label htmlFor="caption" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Caption <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <input
          id="caption"
          name="caption"
          type="text"
          defaultValue={initial?.caption ?? ""}
          placeholder="Short caption for image or section"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Category — OPTIONAL */}
        <div>
          <label htmlFor="category" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
            Category <span className="normal-case text-[#333]">(optional)</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            defaultValue={initial?.category ?? ""}
            placeholder="e.g. Legal Fact, Quote, Spotlight"
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
        <div>
          <label htmlFor="display_order" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
            Display Order
          </label>
          <input
            id="display_order"
            name="display_order"
            type="number"
            min={0}
            step={1}
            defaultValue={initial?.display_order ?? 0}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
      </div>

      {/* Published toggle */}
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="published"
          defaultChecked={initial?.published ?? true}
          className="h-4 w-4"
        />
        <span className="font-admin text-sm text-ink">Published</span>
      </label>

      {state.error ? <p className="font-admin text-sm text-digest-red">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit bg-digest-red px-6 py-3 font-admin text-sm uppercase tracking-wide text-paper disabled:opacity-60"
      >
        {isPending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
