"use client";

import { useActionState, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { IssueRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/issues/actions";
import { TextField, FormSection } from "@/components/forms/kit/field";
import { SubmitButton } from "@/components/forms/kit/submit-button";
import { ImageUploadZone } from "@/components/forms/kit/image-upload";

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
  const reduce = useReducedMotion();

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-5">
      <FormSection title="Edition" subtitle="The issue's identity on the shelf." accent="top">
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
            label="Year"
            id="year"
            name="year"
            type="number"
            min={2000}
            max={2100}
            step={1}
            required
            defaultValue={initial?.year}
            index={1}
          />
        </div>
        <TextField
          label="Season"
          id="season"
          name="season"
          type="text"
          required
          defaultValue={initial?.season}
          placeholder="e.g. Summer"
        />
        <TextField
          label="Edition"
          id="edition"
          name="edition"
          type="text"
          required
          defaultValue={initial?.edition}
          placeholder="e.g. Nigeria Issue"
        />
      </FormSection>

      <FormSection title="Issue Cover Image" subtitle="The public cover shown on the homepage and issue pages." accent="left">
        <ImageUploadZone
          name="cover_image_file"
          label={imagePreview ? "Replace cover image" : "Upload cover image"}
          existingHiddenName="existing_cover_image_url"
          existingValue={initial?.cover_image_url ?? ""}
          initialPreview={imagePreview}
          previewAspect="aspect-[3/4]"
          compact
          onFilesSelected={(files) => setImagePreview(URL.createObjectURL(files[0]))}
        />
        <p className="font-admin text-xs text-stone">
          JPEG, PNG, WEBP, or GIF, up to 5MB. Leave empty to keep the current image.
        </p>
      </FormSection>

      <FormSection title="Digital Edition PDF" subtitle="PDF digital edition for download. Max 20MB." accent="left">
        {pdfPreview ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 border border-hairline bg-white p-3"
            style={{ borderRadius: 2 }}
          >
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
          </motion.div>
        ) : (
          <p className="font-admin text-xs text-stone">No PDF uploaded yet.</p>
        )}
        <TextField
          label=""
          id="pdf_file"
          name="pdf_file"
          type="file"
          accept="application/pdf"
        />
        <input type="hidden" name="existing_pdf_url" value={initial?.pdf_url ?? ""} />
        <p className="font-admin text-xs text-stone">
          Leave empty to keep the current PDF.
        </p>
      </FormSection>

      <FormSection title="Pricing & Release" subtitle="Regional prices and publication date." accent="left">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Price (NGN)"
            id="price_ngn"
            name="price_ngn"
            type="text"
            defaultValue={initial?.price_ngn ?? ""}
            placeholder="₦2,500"
            index={0}
          />
          <TextField
            label="Price (UK)"
            id="price_uk"
            name="price_uk"
            type="text"
            defaultValue={initial?.price_uk ?? ""}
            placeholder="£3.50"
            index={1}
          />
          <TextField
            label="Price (US)"
            id="price_us"
            name="price_us"
            type="text"
            defaultValue={initial?.price_us ?? ""}
            placeholder="$5.50"
            index={2}
          />
        </div>
        <TextField
          label="Published date"
          optional
          id="published_at"
          name="published_at"
          type="date"
          defaultValue={toDateInputValue(initial?.published_at ?? null)}
        />
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
