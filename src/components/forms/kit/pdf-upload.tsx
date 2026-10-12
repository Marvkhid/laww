"use client";

import { useId, useRef, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import {
  PDF_MAX_LABEL,
  pdfSizeError,
  pdfTypeError,
} from "@/lib/upload-limits";
import type { UploadResult } from "@/lib/upload-client";
import {
  beginUploadActivity,
  endUploadActivity,
} from "@/lib/upload-activity";

/**
 * PDF picker for the admin dashboard.
 *
 * Validates the file in the browser BEFORE anything is sent (clear error,
 * nothing uploaded) using the same shared validators the server action applies.
 *
 * The bytes go straight from the browser to storage through the signed-URL
 * uploader, NOT through the form action. That distinction is the whole point
 * for this field: a digital edition is allowed to be up to 30 MB, and a
 * production deployment cannot carry a 30 MB request body through a function
 * (Vercel caps one at 4.5 MB). Posting the PDF inside the form is therefore not
 * merely slow — it can never work in production.
 *
 * On failure the native file input is CLEARED (so the bytes can never be
 * re-posted with the form) while the chosen File is kept in memory so Retry
 * does not make the operator find the file again.
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
  upload?: (file: File, signal?: AbortSignal) => Promise<UploadResult>;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingFileRef = useRef<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  /** Mirrors "pendingFileRef holds something retryable" for render. */
  const [canRetry, setCanRetry] = useState(false);
  const [hiddenValue, setHiddenValue] = useState(existingValue);
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const run = async (file: File) => {
    if (!upload) return;
    pendingFileRef.current = file;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setUploading(true);
    setError(null);
    setRetryable(false);
    setCanRetry(false);
    setUploadedName(null);
    beginUploadActivity();

    try {
      const result = await upload(file, controller.signal);
      if (result.url) {
        setHiddenValue(result.url);
        setUploadedName(file.name);
        setError(null);
        pendingFileRef.current = null;
      } else if (!result.cancelled) {
        setError(result.error ?? "Upload failed. Try again.");
        const canRetryNow = result.retryable !== false;
        setRetryable(canRetryNow);
        setCanRetry(canRetryNow);
      }
    } catch {
      setError("Upload failed. Check your connection and try again.");
      setRetryable(true);
      setCanRetry(true);
    } finally {
      endUploadActivity();
      // The URL is stored (or the attempt is explicitly failed) — either way
      // the raw bytes must not remain attached to the form.
      clearInput();
      setUploading(false);
      abortRef.current = null;
    }
  };

  const onPick = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) {
      setError(null);
      return;
    }
    const validationError = pdfTypeError(file) ?? pdfSizeError(file);
    if (validationError) {
      // Clear the selection so an unsupported/oversized file can never be
      // posted with the form.
      clearInput();
      pendingFileRef.current = null;
      setRetryable(false);
      setCanRetry(false);
      setError(validationError);
      return;
    }
    if (!upload) return; // submit-time fallback (server-side reader)
    // Empty the native input immediately: the File is already held in memory,
    // and a file attached to the form is a request body the production host
    // rejects (413) the moment it grows past its 4.5 MB ceiling.
    clearInput();
    void run(file);
  };

  const retry = () => {
    const file = pendingFileRef.current;
    if (!file) return;
    void run(file);
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploading(false);
    setError(null);
    setRetryable(false);
    setCanRetry(false);
    pendingFileRef.current = null;
    clearInput();
  };

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
        onChange={(e) => onPick(e.target.files)}
        className="w-full border border-hairline bg-white px-4 py-3 font-admin text-sm text-ink file:mr-3 file:border file:border-hairline file:bg-paper-warm file:px-3 file:py-1 file:font-admin file:text-[11px] file:font-semibold file:uppercase file:tracking-[0.1em] file:text-ink focus:outline-none disabled:opacity-60"
        style={{ borderRadius: 2 }}
      />
      <p className="mt-1.5 flex flex-wrap items-center gap-2 font-admin text-xs text-stone">
        Maximum PDF size: {PDF_MAX_LABEL}.{" "}
        {uploading ? (
          <>
            <Loader2 size={12} strokeWidth={2.5} className="animate-spin" />
            Uploading…{" "}
            <button
              type="button"
              onClick={cancel}
              className="font-semibold underline underline-offset-2 hover:text-ink"
            >
              Cancel
            </button>
          </>
        ) : uploadedName ? (
          `Uploaded: ${uploadedName}`
        ) : (
          (helper ?? "Leave empty to keep the current PDF.")
        )}
      </p>
      {error ? (
        <p
          role="alert"
          className="mt-1.5 flex flex-wrap items-center gap-2 font-admin text-xs font-medium text-digest-red"
        >
          {error}
          {retryable && canRetry ? (
            <button
              type="button"
              data-testid="pdf-retry"
              onClick={retry}
              className="inline-flex items-center gap-1 border border-digest-red/40 px-2 py-0.5 font-admin text-[10px] font-semibold uppercase tracking-[0.08em] text-digest-red hover:bg-digest-red hover:text-paper"
              style={{ borderRadius: 2 }}
            >
              <RotateCcw size={11} strokeWidth={2.5} />
              Retry upload
            </button>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
