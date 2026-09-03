"use client";

import { useActionState, useState } from "react";
import type { IssueRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/issues/actions";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function IssueForm({
  action,
  initial,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<
    IssueRow,
    | "issue_number"
    | "season"
    | "year"
    | "edition"
    | "cover_image_url"
    | "pdf_url"
    | "price_ngn"
    | "price_uk"
    | "price_us"
    | "published_at"
  >;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [pdfPreview, setPdfPreview] = useState<string | null>(initial?.pdf_url ?? null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.cover_image_url ?? null);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-6">
      {/* ── Basic fields ── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="issue_number"
            className="font-admin text-xs font-semibold uppercase tracking-wide text-ink"
          >
            Issue number
          </label>
          <input
            id="issue_number"
            name="issue_number"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={initial?.issue_number}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
        <div>
          <label htmlFor="year" className="font-admin text-xs font-semibold uppercase tracking-wide text-ink">
            Year
          </label>
          <input
            id="year"
            name="year"
            type="number"
            min={2000}
            max={2100}
            step={1}
            required
            defaultValue={initial?.year}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
      </div>
      <div>
        <label htmlFor="season" className="font-admin text-xs font-semibold uppercase tracking-wide text-ink">
          Season
        </label>
        <input
          id="season"
          name="season"
          type="text"
          required
          defaultValue={initial?.season}
          placeholder="e.g. Summer"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label
          htmlFor="edition"
          className="font-admin text-xs font-semibold uppercase tracking-wide text-ink"
        >
          Edition
        </label>
        <input
          id="edition"
          name="edition"
          type="text"
          required
          defaultValue={initial?.edition}
          placeholder="e.g. Nigeria Issue"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>

      {/* ── Cover Image (independent) ── */}
      <fieldset className="border border-hairline p-4">
        <legend className="font-admin text-xs font-semibold uppercase tracking-wide text-ink px-1">
          Issue Cover Image
        </legend>
        {imagePreview ? (
          <div className="mt-2 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Cover image preview"
              className="h-48 w-auto border border-hairline object-contain"
            />
            <button
              type="button"
              onClick={() => {
                setImagePreview(null);
                const input = document.getElementById("cover_image_file") as HTMLInputElement | null;
                if (input) input.value = "";
              }}
              className="mt-2 font-admin text-xs text-digest-red hover:text-digest-red-deep"
            >
              Remove image
            </button>
          </div>
        ) : (
          <p className="mt-2 font-admin text-xs text-[#333]">
            No cover image uploaded yet.
          </p>
        )}
        <input
          id="cover_image_file"
          name="cover_image_file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setImagePreview(URL.createObjectURL(file));
          }}
          className="mt-2 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <input
          type="hidden"
          name="existing_cover_image_url"
          value={initial?.cover_image_url ?? ""}
        />
        <p className="mt-1 font-admin text-xs text-[#333]">
          JPEG, PNG, WEBP, or GIF, up to 5MB. This is the public cover image shown on the
          homepage and issue pages. Leave empty to keep the current image.
        </p>
      </fieldset>

      {/* ── PDF (independent) ── */}
      <fieldset className="border border-hairline p-4">
        <legend className="font-admin text-xs font-semibold uppercase tracking-wide text-ink px-1">
          Digital Edition PDF
        </legend>
        {pdfPreview ? (
          <div className="mt-2 mb-3 flex items-center gap-3 border border-hairline p-3 bg-white">
            <span className="font-admin text-sm text-ink">📄 PDF uploaded</span>
            <a
              href={pdfPreview}
              target="_blank"
              rel="noopener noreferrer"
              className="font-admin text-xs text-digest-red hover:underline"
            >
              View
            </a>
            <button
              type="button"
              onClick={() => {
                setPdfPreview(null);
                const input = document.getElementById("pdf_file") as HTMLInputElement | null;
                if (input) input.value = "";
              }}
              className="font-admin text-xs text-digest-red hover:text-digest-red-deep"
            >
              Remove
            </button>
          </div>
        ) : (
          <p className="mt-2 font-admin text-xs text-[#333]">
            No PDF uploaded yet.
          </p>
        )}
        <input
          id="pdf_file"
          name="pdf_file"
          type="file"
          accept="application/pdf"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setPdfPreview(URL.createObjectURL(file));
          }}
          className="mt-2 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <input
          type="hidden"
          name="existing_pdf_url"
          value={initial?.pdf_url ?? ""}
        />
        <p className="mt-1 font-admin text-xs text-[#333]">
          PDF digital edition for download. Max 20MB. Leave empty to keep the current PDF.
        </p>
      </fieldset>

      {/* ── Prices ── */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="price_ngn"
            className="font-admin text-xs font-semibold uppercase tracking-wide text-ink"
          >
            Price (NGN)
          </label>
          <input
            id="price_ngn"
            name="price_ngn"
            type="text"
            defaultValue={initial?.price_ngn ?? ""}
            placeholder="₦2,500"
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
        <div>
          <label
            htmlFor="price_uk"
            className="font-admin text-xs font-semibold uppercase tracking-wide text-ink"
          >
            Price (UK)
          </label>
          <input
            id="price_uk"
            name="price_uk"
            type="text"
            defaultValue={initial?.price_uk ?? ""}
            placeholder="£3.50"
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
        <div>
          <label
            htmlFor="price_us"
            className="font-admin text-xs font-semibold uppercase tracking-wide text-ink"
          >
            Price (US)
          </label>
          <input
            id="price_us"
            name="price_us"
            type="text"
            defaultValue={initial?.price_us ?? ""}
            placeholder="$5.50"
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
      </div>

      {/* ── Published date ── */}
      <div>
        <label
          htmlFor="published_at"
          className="font-admin text-xs font-semibold uppercase tracking-wide text-ink"
        >
          Published date <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <input
          id="published_at"
          name="published_at"
          type="date"
          defaultValue={toDateInputValue(initial?.published_at ?? null)}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>

      {state.error ? <p className="font-admin text-sm text-digest-red">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit bg-digest-red px-6 py-3 font-admin text-sm font-semibold uppercase tracking-wide text-paper disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
