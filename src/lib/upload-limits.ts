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

/** MIME types the image bucket accepts, in one place for client and server. */
export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const IMAGE_TYPE_LABEL = "JPEG, PNG, WEBP, or GIF";

export const PDF_TYPE = "application/pdf";

/**
 * The validators below are the ONLY place an upload rejection is worded.
 *
 * The browser validates with them before anything leaves the machine and the
 * server action re-validates with the exact same functions, so the message the
 * admin reads and the rejection the server would have produced cannot drift
 * apart (that drift is how "up to 5MB" on screen became a hard failure in
 * production — see lib/upload-client.ts).
 */
export function imageTypeError(
  file: { type: string },
  label = "Image"
): string | null {
  const type = (file.type || "").toLowerCase();
  if (!(IMAGE_TYPES as readonly string[]).includes(type)) {
    return `${label} must be a ${IMAGE_TYPE_LABEL}.`;
  }
  return null;
}

export function imageSizeError(
  file: { size: number },
  label = "Image"
): string | null {
  if (file.size > IMAGE_MAX_BYTES) {
    return `${label} must be ${IMAGE_MAX_LABEL} or smaller (this file is ${formatMb(file.size)} MB).`;
  }
  return null;
}

export function pdfTypeError(file: { type: string }): string | null {
  const type = (file.type || "").toLowerCase();
  if (type !== PDF_TYPE) return "File must be a PDF.";
  return null;
}

export function pdfSizeError(file: { size: number }): string | null {
  if (file.size > PDF_MAX_BYTES) {
    return `PDF is too large (${formatMb(file.size)} MB). Maximum PDF size: ${PDF_MAX_LABEL}.`;
  }
  return null;
}

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}
