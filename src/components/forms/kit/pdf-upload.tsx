"use client";

import { useId, useRef, useState } from "react";
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
  existingHiddenName,
  existingValue = "",
  upload,
}: {
  name?: string;
  disabled?: boolean;
  helper?: string;
  /** Hidden field carrying the already-saved PDF URL (kept when no new file is picked). */
  existingHiddenName?: string;
  existingValue?: string;
  /** Upload-on-select: send the file to storage the moment it is chosen. */
  upload?: (file: File) => Promise<{ url: string | null; error: string | null }>;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hiddenValue, setHiddenValue] = useState(existingValue);
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  return (
    <div>
      {existingHiddenName ? (
        <input type="hidden" name={existingHiddenName} value={hiddenValue} />
      ) : null}
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept="application/pdf"
        disabled={disabled || uploading}
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
          if (upload) {
            setUploading(true);
            setUploadedName(null);
            void upload(file)
              .then((result) => {
                setUploading(false);
                if (result.error || !result.url) {
                  setError(result.error ?? "Upload failed. Try again.");
                  e.target.value = "";
                  return;
                }
                setHiddenValue(result.url);
                setUploadedName(file.name);
                // URL is stored — never post the same bytes twice.
                e.target.value = "";
              })
              .catch(() => {
                setUploading(false);
                setError("Upload failed. Check your connection and try again.");
                e.target.value = "";
              });
          }
        }}
        className="w-full border border-hairline bg-white px-4 py-3 font-admin text-sm text-ink file:mr-3 file:border file:border-hairline file:bg-paper-warm file:px-3 file:py-1 file:font-admin file:text-[11px] file:font-semibold file:uppercase file:tracking-[0.1em] file:text-ink focus:outline-none disabled:opacity-60"
        style={{ borderRadius: 2 }}
      />
      <p className="mt-1.5 font-admin text-xs text-stone">
        Maximum PDF size: {PDF_MAX_LABEL}.{" "}
        {uploading
          ? "Uploading…"
          : uploadedName
            ? `Uploaded: ${uploadedName}`
            : (helper ?? "Leave empty to keep the current PDF.")}
      </p>
      {error ? (
        <p role="alert" className="mt-1.5 font-admin text-xs font-medium text-digest-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
