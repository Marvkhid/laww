"use server";

/**
 * Signed-URL uploads — the fix for the production-only upload failure.
 *
 * ── The defect this replaces ────────────────────────────────────────────────
 * Every upload in this CMS used to send the RAW FILE through a Next.js Server
 * Action, i.e. through a Vercel Function. Vercel caps a Function request body
 * at 4.5 MB (https://vercel.com/docs/functions/limitations — "the maximum
 * payload size for the request body … is 4.5 MB"), and that ceiling applies to
 * Server Actions and Route Handlers alike. The app, however, advertises 5 MB
 * images and 30 MB PDFs and set `serverActions.bodySizeLimit` to 50mb, which
 * only governs Next.js itself — not the platform. So:
 *
 *   • uploads worked on a local `next dev` / `next start` (no platform limit),
 *   • uploads worked in production for files comfortably under 4.5 MB,
 *   • uploads above ~4.5 MB failed in production only, in every browser, on
 *     every machine — exactly the "works on my laptop, not on the client's"
 *     shape of the report.
 *
 * ── The fix ─────────────────────────────────────────────────────────────────
 * The bytes now go straight from the browser to Supabase Storage. This action
 * only mints a short-lived, single-path signed upload URL, so a multi-MB file
 * never traverses a Function and the limits we advertise are the limits that
 * actually apply.
 *
 * Security is unchanged: the action calls requireAdmin() first (no session ⇒
 * redirect to login, exactly like every other admin mutation), and the object
 * path is generated on the server from a whitelisted section + a random UUID,
 * so a caller cannot choose a path, escape its folder, or write outside the
 * one public media bucket. Type and size are re-validated here with the same
 * shared validators the browser uses.
 */

import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import { logAdminEvent } from "@/lib/admin-diagnostics";
import {
  PDF_TYPE,
  imageSizeError,
  imageTypeError,
  pdfTypeError,
  pdfSizeError,
} from "@/lib/upload-limits";
import {
  allowedKindsFor,
  type UploadFolder,
  type UploadKind,
} from "@/lib/upload-folders";

const BUCKET = "article-images";

export type { UploadFolder, UploadKind };

export type SignedUploadRequest = {
  kind: UploadKind;
  folder: UploadFolder;
  contentType: string;
  size: number;
  /** Original file name — used only for the extension fallback. */
  name: string;
};

export type SignedUploadResult = {
  /** Storage object path inside the bucket (server-generated). */
  path: string | null;
  /** One-shot token bound to `path`. */
  token: string | null;
  /** Full signed PUT URL. Never rendered or persisted by the client. */
  signedUrl: string | null;
  /** Public URL the row will store. */
  publicUrl: string | null;
  error: string | null;
};

function extensionFor(contentType: string, name: string): string {
  switch (contentType.toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case PDF_TYPE:
      return "pdf";
    default: {
      const fromName = name.includes(".") ? name.split(".").pop() : null;
      return fromName && /^[a-z0-9]{1,5}$/i.test(fromName)
        ? fromName.toLowerCase()
        : "bin";
    }
  }
}

/**
 * Authorize and describe one direct upload.
 *
 * Returns a structured result rather than throwing, so the browser can show a
 * stage-accurate message ("your session expired" vs "that file is too large")
 * instead of a generic failure.
 */
export async function createSignedUploadAction(
  request: SignedUploadRequest
): Promise<SignedUploadResult> {
  const startedAt = Date.now();
  const fail = (
    error: string,
    category: string,
    stage: "validate" | "sign" = "validate"
  ): SignedUploadResult => {
    logAdminEvent({
      op: "upload",
      section: request.folder,
      stage,
      outcome: "failed",
      category,
      ms: Date.now() - startedAt,
      detail: error,
    });
    return { path: null, token: null, signedUrl: null, publicUrl: null, error };
  };

  // A session is required — same guard as every other admin mutation.
  const supabase = await requireAdmin();

  const folder = request.folder;
  const allowedKinds = allowedKindsFor(folder);
  if (!allowedKinds) return fail("Unknown upload destination.", "bad_folder");
  // A section only accepts the kinds it actually handles — e.g. issues and
  // archive editions take a cover image and a PDF, nothing else takes a PDF.
  if (!allowedKinds.includes(request.kind)) {
    return fail("That kind of file is not accepted here.", "bad_kind");
  }

  const file = {
    type: String(request.contentType ?? ""),
    size: Number(request.size ?? 0),
    name: String(request.name ?? ""),
  };
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return fail("That file appears to be empty.", "empty");
  }

  // This action receives a plain JSON object, so these two are the only
  // caller-supplied strings in it: cap them instead of letting a hostile body
  // grow towards the host's request limit (see src/lib/request-limits.ts).
  if (file.name.length > 260 || file.type.length > 120) {
    return fail("That file name or type is too long.", "bad_name");
  }

  if (request.kind === "pdf") {
    const typeError = pdfTypeError(file);
    if (typeError) return fail(typeError, "bad_type");
    const sizeError = pdfSizeError(file);
    if (sizeError) return fail(sizeError, "too_large");
  } else {
    const typeError = imageTypeError(file);
    if (typeError) return fail(typeError, "bad_type");
    const sizeError = imageSizeError(file);
    if (sizeError) return fail(sizeError, "too_large");
  }

  // Server-generated path: the caller cannot choose where bytes land.
  const path = `${folder}/${randomUUID()}.${extensionFor(file.type, file.name)}`;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data?.signedUrl || !data.token) {
      logAdminEvent({
        op: "upload",
        section: folder,
        stage: "sign",
        outcome: "failed",
        category: "sign_failed",
        ms: Date.now() - startedAt,
        detail: error?.message ?? "no signed url returned",
      });
      return {
        path: null,
        token: null,
        signedUrl: null,
        publicUrl: null,
        error: "Could not start the upload. Please try again.",
      };
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    logAdminEvent({
      op: "upload",
      section: folder,
      stage: "sign",
      outcome: "ok",
      ms: Date.now() - startedAt,
      category: request.kind,
    });

    return {
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publicData.publicUrl,
      error: null,
    };
  } catch (err) {
    logAdminEvent({
      op: "upload",
      section: folder,
      stage: "sign",
      outcome: "failed",
      category: "sign_threw",
      ms: Date.now() - startedAt,
      detail: err instanceof Error ? err.message : "unknown",
    });
    return {
      path: null,
      token: null,
      signedUrl: null,
      publicUrl: null,
      error: "Could not start the upload. Please try again.",
    };
  }
}
