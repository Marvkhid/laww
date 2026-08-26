"use client";

import { useActionState } from "react";
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
  initial?: Pick<LegalInsightRow, "title" | "content" | "description" | "category" | "image_url" | "published" | "display_order">;
  submitLabel: string;
  entityId?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-6">
      {entityId ? <input type="hidden" name="entity_id" value={entityId} /> : null}

      <div>
        <label htmlFor="title" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title ?? ""}
          placeholder="e.g. What is Habeas Corpus?"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>

      <div>
        <label htmlFor="content" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Content / Answer
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={4}
          defaultValue={initial?.content ?? ""}
          placeholder="The legal insight or educational content..."
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>

      <div>
        <label htmlFor="description" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Short Description <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <input
          id="description"
          name="description"
          type="text"
          defaultValue={initial?.description ?? ""}
          placeholder="Brief summary for cards"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={initial?.category ?? "general"}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
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

      {/* Image upload */}
      <fieldset className="border border-hairline p-4">
        <legend className="font-admin text-xs font-medium uppercase tracking-wide text-ink px-1">
          Image <span className="normal-case">(optional)</span>
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
          className="mt-2 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <input type="hidden" name="existing_image_url" value={initial?.image_url ?? ""} />
        <p className="mt-1 font-admin text-xs text-[#333]">
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
