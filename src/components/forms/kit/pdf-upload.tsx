"use client";

import { useId, useState } from "react";
import { PDF_MAX_LABEL, pdfSizeError } from "@/lib/upload-limits";

/**
 * PDF picker for the admin dashboard.
 *
 * Validates the file in the browser BEFORE the form is submitted (clear
 * error, nothing uploaded), and states the limit the server enforces:
 * the same constant drives both sides.
 */
export function PdfFileField({
  name = "pdf_file",
  disabled = false,
  helper,
}: {
  name?: string;
  disabled?: boolean;
  helper?: string;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <input
        id={id}
        name={name}
        type="file"
        accept="application/pdf"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) {
            setError(null);
            return;
          }
          const sizeError = pdfSizeError(file);
          if (sizeError) {
            // Clear the selection so an oversized file can never be posted.
            e.target.value = "";
            setError(sizeError);
            return;
          }
          setError(null);
        }}
        className="w-full border border-hairline bg-white px-4 py-3 font-admin text-sm text-ink file:mr-3 file:border file:border-hairline file:bg-paper-warm file:px-3 file:py-1 file:font-admin file:text-[11px] file:font-semibold file:uppercase file:tracking-[0.1em] file:text-ink focus:outline-none disabled:opacity-60"
        style={{ borderRadius: 2 }}
      />
      <p className="mt-1.5 font-admin text-xs text-stone">
        Maximum PDF size: {PDF_MAX_LABEL}.{" "}
        {helper ?? "Leave empty to keep the current PDF."}
      </p>
      {error ? (
        <p role="alert" className="mt-1.5 font-admin text-xs font-medium text-digest-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
