/**
 * Upload limits — ONE definition shared by the admin forms (client) and the
 * storage helpers (server), so the message the admin reads, the validation
 * that runs in the browser, and the rejection that runs on the server can
 * never disagree.
 */

/** Hard ceiling for digital-edition PDFs, enforced end to end. */
export const PDF_MAX_BYTES = 30 * 1024 * 1024; // 30 MB

/** Human-readable form of PDF_MAX_BYTES for admin-facing copy. */
export const PDF_MAX_LABEL = "30 MB";

/** Ceiling for images (cover, inline, gallery, sponsor/ad artwork). */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const IMAGE_MAX_LABEL = "5MB";

export function pdfSizeError(file: File): string | null {
  if (file.size > PDF_MAX_BYTES) {
    return `PDF is too large (${formatMb(file.size)} MB). Maximum PDF size: ${PDF_MAX_LABEL}.`;
  }
  return null;
}

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}
