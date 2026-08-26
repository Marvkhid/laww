"use client";

import { useActionState, useState } from "react";
import type { IssuesArchiveRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/issues/archive/actions";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function ArchiveIssueForm({
  action,
  initial,
  entityId,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<IssuesArchiveRow, "slug" | "title" | "description" | "cover_image_url" | "issue_number" | "season" | "year" | "pdf_url">;
  entityId?: string;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [coverPreview, setCoverPreview] = useState<string | null>(initial?.cover_image_url ?? null);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div>
        <label htmlFor="title" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title}
          placeholder="e.g. Issue 38 — Spring 2026"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="slug" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          defaultValue={initial?.slug}
          placeholder="e.g. issue-38-spring-2026"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="description" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Description <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="issue_number" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
            Issue Number <span className="normal-case text-[#333]">(optional)</span>
          </label>
          <input
            id="issue_number"
            name="issue_number"
            type="number"
            min={1}
            defaultValue={initial?.issue_number ?? ""}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
        <div>
          <label htmlFor="season" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
            Season <span className="normal-case text-[#333]">(optional)</span>
          </label>
          <input
            id="season"
            name="season"
            type="text"
            defaultValue={initial?.season ?? ""}
            placeholder="e.g. Spring"
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
        <div>
          <label htmlFor="year" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
            Year <span className="normal-case text-[#333]">(optional)</span>
          </label>
          <input
            id="year"
            name="year"
            type="number"
            min={2020}
            max={2099}
            defaultValue={initial?.year ?? ""}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
      </div>

      {/* Cover Image */}
      <fieldset className="border border-hairline p-4">
        <legend className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Cover Image <span className="normal-case text-[#333]">(optional)</span>
        </legend>
        {coverPreview ? (
          <div className="mt-2 aspect-[3/4] w-full max-w-[200px] overflow-hidden border border-hairline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
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
          className="mt-2 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <input type="hidden" name="existing_cover_image_url" value={initial?.cover_image_url ?? ""} />
      </fieldset>

      {/* PDF */}
      <fieldset className="border border-hairline p-4">
        <legend className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Digital Edition PDF <span className="normal-case text-[#333]">(optional)</span>
        </legend>
        {initial?.pdf_url ? (
          <p className="mt-2 font-admin text-xs text-[#333]">
            Current PDF:{" "}
            <a href={initial.pdf_url} target="_blank" rel="noopener noreferrer" className="text-digest-red underline">
              View
            </a>
          </p>
        ) : null}
        <input
          id="pdf_file"
          name="pdf_file"
          type="file"
          accept="application/pdf"
          className="mt-2 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <input type="hidden" name="existing_pdf_url" value={initial?.pdf_url ?? ""} />
        <p className="mt-1 font-admin text-xs text-[#333]">
          PDF up to 20MB. Leave empty to keep the current PDF.
        </p>
      </fieldset>

      {entityId ? <input type="hidden" name="entity_id" value={entityId} /> : null}
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
