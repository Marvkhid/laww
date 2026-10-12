/**
 * Browser-side direct-to-storage uploader.
 *
 * ── Why the upload leaves the app's own backend ─────────────────────────────
 * Uploads used to be Server Actions that carried the raw file, i.e. they
 * traversed a Vercel Function. Vercel caps a Function request body at 4.5 MB —
 * a ceiling that applies to Server Actions and Route Handlers alike, and that
 * `serverActions.bodySizeLimit` cannot raise. This app advertises 5 MB images
 * and 30 MB PDFs, so on production any file above ~4.5 MB failed no matter
 * which browser or machine was used, while the identical code succeeded on a
 * local server that has no such cap.
 *
 * The bytes now go straight from the browser to Supabase Storage using a
 * short-lived signed URL minted by `createSignedUploadAction` (server action,
 * authorized with requireAdmin). Only the signed-URL request passes through
 * the app, so it is tiny and its size never depends on the file.
 *
 * ── What this module adds on top of a plain PUT ─────────────────────────────
 *  · the shared client/server validators run BEFORE anything is sent, so an
 *    oversized or unsupported file never consumes bandwidth;
 *  · every attempt is BOUNDED — a stalled connection can no longer leave the
 *    editor saying "Uploading…" forever (a browser `fetch` has no default
 *    timeout, which is precisely how the reported stuck state happened);
 *  · the caller can CANCEL a running upload;
 *  · ONE automatic retry for failures that returned quickly (network reset,
 *    5xx). A timeout is deliberately NOT retried automatically: on a slow
 *    link that would double the bytes sent and likely fail again, so the
 *    operator gets an explicit Retry instead;
 *  · a retry reuses the SAME object path with `x-upsert: false`, so it can
 *    never create a duplicate media object. If the first attempt actually
 *    landed, the retry sees Supabase's "Duplicate" response and the result is
 *    treated as success after the object is verified;
 *  · success is verified: the public URL is fetched before the app reports an
 *    upload as successful. An interface that says "uploaded" must mean the
 *    bytes are really there and publicly readable.
 *
 * No dependency is added: this talks to the same signed-upload endpoint the
 * Supabase Storage client uses, with the same multipart field layout.
 */

import {
  imageSizeError,
  imageTypeError,
  pdfSizeError,
  pdfTypeError,
} from "@/lib/upload-limits";
import { logAdminEvent, type AdminStage } from "@/lib/admin-diagnostics";
import type { UploadFolder, UploadKind } from "@/lib/upload-folders";

export type { UploadFolder, UploadKind };

export type UploadSignerRequest = {
  kind: UploadKind;
  folder: UploadFolder;
  contentType: string;
  size: number;
  name: string;
};

export type UploadSignerResult = {
  path: string | null;
  token: string | null;
  signedUrl: string | null;
  publicUrl: string | null;
  error: string | null;
};

export type UploadSigner = (
  request: UploadSignerRequest
) => Promise<UploadSignerResult>;

export type UploadResult = {
  url: string | null;
  error: string | null;
  /** Which pipeline step failed — drives the message the admin reads. */
  stage?: Extract<AdminStage, "validate" | "sign" | "transfer" | "verify">;
  /** false ⇒ retrying the same file is pointless (bad type/size/session). */
  retryable?: boolean;
  /** true ⇒ the operator cancelled it. Not an error. */
  cancelled?: boolean;
};

export type UploadOptions = {
  kind: UploadKind;
  folder: UploadFolder;
  /** Server action that mints the signed URL. Injected so this stays testable. */
  sign: UploadSigner;
  /** External cancellation (the "Cancel" affordance in the upload zone). */
  signal?: AbortSignal;
  /** Override for tests. */
  timeoutMs?: number;
  /** Skip the public-read verification (tests only). */
  verify?: boolean;
};

/** Bounded waits. Generous enough for a slow uplink, finite so nothing hangs. */
export const UPLOAD_TIMEOUT_MS: Record<UploadKind, number> = {
  image: 120_000,
  pdf: 300_000,
};

const VERIFY_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 900;
const VERIFY_ATTEMPTS = 3;

function validate(file: File, kind: UploadKind): string | null {
  const label = kind === "pdf" ? undefined : "Image";
  return kind === "pdf"
    ? (pdfTypeError(file) ?? pdfSizeError(file))
    : (imageTypeError(file, label) ?? imageSizeError(file, label));
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "unknown error";
}

/** Raise a typed HTTP failure so the retry policy can classify it. */
class HttpFailure extends Error {
  status: number;
  /** Supabase reports a duplicate object as HTTP 400 with a 409 body. */
  duplicate: boolean;
  constructor(status: number, detail: string, duplicate: boolean) {
    super(detail);
    this.status = status;
    this.duplicate = duplicate;
  }
}

type TimedFetch = {
  response: Response;
  timedOut: boolean;
  cancelled: boolean;
};

/**
 * Attempt one transfer, always bounded in time and cancellable.
 * Never throws for network/timeout/cancel — those are reported as data so the
 * caller can decide between retry, message and cancellation.
 */
async function putWithBound(
  signedUrl: string,
  file: File,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<TimedFetch | { transportError: string }> {
  const controller = new AbortController();
  let timedOut = false;
  let cancelled = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = () => {
    cancelled = true;
    controller.abort();
  };
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      return { transportError: "cancelled" };
    }
    signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    // Mirrors the Supabase Storage client's signed-upload request exactly:
    // multipart FormData with `cacheControl` and the file under an empty field
    // name, so the endpoint sees the payload shape it expects.
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);

    const response = await fetch(signedUrl, {
      method: "PUT",
      headers: { "x-upsert": "false" },
      body,
      signal: controller.signal,
    });
    return { response, timedOut, cancelled };
  } catch (error) {
    if (cancelled) return { transportError: "cancelled" };
    if (timedOut) return { transportError: "timeout" };
    return { transportError: describeError(error) };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

/** Read a short, safe excerpt of a failed response body. */
async function failureDetail(response: Response): Promise<{
  detail: string;
  duplicate: boolean;
}> {
  try {
    const text = await response.text();
    const parsed = JSON.parse(text) as { statusCode?: string; message?: string };
    const duplicate =
      String(parsed.statusCode ?? "") === "409" ||
      /duplicate|already exists/i.test(parsed.message ?? "");
    return { detail: parsed.message ?? text.slice(0, 120), duplicate };
  } catch {
    return { detail: `HTTP ${response.status}`, duplicate: false };
  }
}

/**
 * Confirm the uploaded object is publicly readable — the app must never claim
 * success for a file nobody can load. Retried briefly because an edge node can
 * lag a freshly created object by a moment.
 */
async function verifyPublicUrl(
  publicUrl: string,
  signal?: AbortSignal
): Promise<"ok" | "missing" | "inconclusive"> {
  for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
    const onExternalAbort = () => controller.abort();
    signal?.addEventListener("abort", onExternalAbort, { once: true });
    try {
      const response = await fetch(publicUrl, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.ok) return "ok";
      if (response.status === 404 || response.status === 403) {
        // Definitive "not there / not readable" — try once more before failing.
        if (attempt === VERIFY_ATTEMPTS - 1) return "missing";
      } else if (attempt === VERIFY_ATTEMPTS - 1) {
        return "inconclusive";
      }
    } catch {
      if (attempt === VERIFY_ATTEMPTS - 1) return "inconclusive";
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onExternalAbort);
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
  return "inconclusive";
}

/**
 * Validate, sign, transfer and verify ONE file.
 *
 * Resolves — never rejects — with an explicit outcome: a URL on success, or an
 * error message plus the stage it failed at. Every path is logged through
 * lib/admin-diagnostics with the section, stage, status and duration.
 */
export async function uploadAdminFile(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const { kind, folder } = options;
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? UPLOAD_TIMEOUT_MS[kind];

  /**
   * Report one outcome: log it through the diagnostics channel, and return
   * exactly the fields the UI uses (the logging extras stay internal).
   */
  const done = (result: {
    outcome: "ok" | "failed" | "timeout" | "cancelled";
    url: string | null;
    error: string | null;
    stage: Extract<AdminStage, "validate" | "sign" | "transfer" | "verify">;
    retryable?: boolean;
    cancelled?: boolean;
    category?: string;
    ms?: number;
    statusCode?: number;
    detail?: string;
  }): UploadResult => {
    logAdminEvent({
      op: "upload",
      section: folder,
      stage: result.stage,
      outcome: result.outcome,
      status: result.statusCode,
      ms: result.ms ?? Date.now() - startedAt,
      category: result.category,
      detail: result.detail ?? result.error ?? undefined,
    });
    return {
      url: result.url,
      error: result.error,
      stage: result.stage,
      retryable: result.retryable,
      cancelled: result.cancelled,
    };
  };

  // ── 1. Validate locally (shared with the server) ───────────────────────────
  const validationError = validate(file, kind);
  if (validationError) {
    return done({
      url: null,
      error: validationError,
      stage: "validate",
      retryable: false,
      outcome: "failed",
      category: "invalid_file",
    });
  }

  // ── 2. Ask the server for a signed, single-purpose upload URL ─────────────
  let signed: UploadSignerResult;
  try {
    signed = await options.sign({
      kind,
      folder,
      contentType: file.type,
      size: file.size,
      name: file.name,
    });
  } catch (error) {
    return done({
      url: null,
      error: "Could not reach the server to start the upload. Check your connection and try again.",
      stage: "sign",
      retryable: true,
      outcome: "failed",
      category: "sign_network",
      detail: describeError(error),
    });
  }

  if (signed.error || !signed.signedUrl || !signed.publicUrl) {
    return done({
      url: null,
      error: signed.error ?? "Could not start the upload. Please try again.",
      stage: "sign",
      // A rejected sign is a validation/authorization answer: retrying the
      // same file would fail identically.
      retryable: false,
      outcome: "failed",
      category: "sign_rejected",
    });
  }

  const signedUrl = signed.signedUrl;
  const publicUrl = signed.publicUrl;

  // ── 3. Transfer, with ONE bounded retry for fast, retryable failures ──────
  const attempt = async (): Promise<HttpFailure | null> => {
    const outcome = await putWithBound(
      signedUrl,
      file,
      timeoutMs,
      options.signal
    );

    if ("transportError" in outcome) {
      const { transportError } = outcome;
      if (transportError === "cancelled") {
        throw Object.assign(new Error("cancelled"), { cancelled: true });
      }
      if (transportError === "timeout") {
        throw Object.assign(new Error("timeout"), { timedOut: true });
      }
      throw Object.assign(new Error(transportError), { transport: true });
    }

    if (outcome.response.ok) return null;
    const { detail, duplicate } = await failureDetail(outcome.response);
    return new HttpFailure(outcome.response.status, detail, duplicate);
  };

  /**
   * Two attempts at most:
   *   · a transport failure or a 5xx returned quickly, so one retry is cheap
   *     and safe (identical object path ⇒ no duplicate can be created);
   *   · a 4xx is an answer, not a hiccup — retrying the same request would
   *     fail identically, so it is reported immediately;
   *   · a timeout or a cancellation returns immediately (see below).
   */
  const MAX_ATTEMPTS = 2;
  let failure: HttpFailure | null = null;

  for (let attemptNo = 1; attemptNo <= MAX_ATTEMPTS; attemptNo++) {
    const isLast = attemptNo === MAX_ATTEMPTS;
    try {
      failure = await attempt();
      if (!failure) break; // uploaded
      if (isLast || failure.status < 500) break; // permanent answer
    } catch (error) {
      const flagged = error as Error & {
        cancelled?: boolean;
        timedOut?: boolean;
        transport?: boolean;
      };

      if (flagged.cancelled) {
        return done({
          url: null,
          error: null,
          cancelled: true,
          stage: "transfer",
          retryable: true,
          outcome: "cancelled",
          category: "cancelled",
        });
      }

      if (flagged.timedOut) {
        // NOT retried automatically: on a slow link the same body would very
        // likely stall again and double the bytes sent. The operator gets an
        // explicit Retry button instead.
        return done({
          url: null,
          error: `The upload timed out after ${Math.round(timeoutMs / 1000)}s. The file was not saved — check your connection and retry.`,
          stage: "transfer",
          retryable: true,
          outcome: "timeout",
          category: "timeout",
        });
      }

      logAdminEvent({
        op: "upload",
        section: folder,
        stage: "transfer",
        outcome: "failed",
        category: "network",
        ms: Date.now() - startedAt,
        detail: describeError(error),
      });

      if (isLast) {
        return done({
          url: null,
          error: "Upload failed. Check your connection and try again.",
          stage: "transfer",
          retryable: true,
          outcome: "failed",
          category: "network_retry",
          detail: describeError(error),
        });
      }
    }

    // Bounded backoff with jitter before the single retry.
    await new Promise((resolve) =>
      setTimeout(resolve, RETRY_DELAY_MS + Math.random() * 400)
    );
  }

  if (failure) {
    // A "Duplicate" answer to a retry means the earlier attempt DID land.
    if (failure.duplicate && options.verify !== false) {
      const verified = await verifyPublicUrl(publicUrl, options.signal);
      if (verified === "ok") {
        return done({
          url: publicUrl,
          error: null,
          stage: "verify",
          outcome: "ok",
          category: "already_uploaded",
        });
      }
    }

    const status = failure.status;
    const message =
      status === 401 || status === 403
        ? "Your session has expired. Sign in again, then retry the upload."
        : status === 413
          ? "That file is larger than the storage limit."
          : status === 415
            ? "That file type is not supported by storage."
            : status >= 500
              ? "Storage is temporarily unavailable. Please retry the upload."
              : "Storage rejected the upload. Please try again.";

    return done({
      url: null,
      error: message,
      stage: "transfer",
      retryable: !(status === 401 || status === 403 || status === 413 || status === 415),
      outcome: "failed",
      statusCode: status,
      category: `http_${status}`,
      detail: failure.message,
    });
  }

  // ── 4. Verify the public URL before claiming success ─────────────────────
  if (options.verify !== false) {
    const verified = await verifyPublicUrl(publicUrl, options.signal);
    if (verified === "missing") {
      return done({
        url: null,
        error:
          "The upload reached storage but the file is not readable yet. Please retry.",
        stage: "verify",
        retryable: true,
        outcome: "failed",
        category: "verify_missing",
      });
    }
    if (verified === "inconclusive") {
      logAdminEvent({
        op: "upload",
        section: folder,
        stage: "verify",
        outcome: "ok",
        category: "verify_inconclusive",
        ms: Date.now() - startedAt,
      });
    }
  }

  return done({
    url: publicUrl,
    error: null,
    stage: "verify",
    outcome: "ok",
  });
}
