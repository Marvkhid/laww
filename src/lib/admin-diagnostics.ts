/**
 * Admin diagnostics — structured, safe operational logging for the CMS.
 *
 * Why this exists: the upload/save failures reported from the client's laptop
 * could not be diagnosed because there was no browser console, no network tab
 * and no server-side trace of the failing stage. Every admin operation that
 * can hang or fail now emits ONE structured record naming the operation, the
 * section, the stage, the HTTP status (when there was one) and how long it
 * took — so an upload failure, a save failure and a navigation failure can be
 * told apart without asking the operator to read a stack trace.
 *
 * It is deliberately dependency-free and identical on client and server.
 *
 * ── What may NEVER be recorded ───────────────────────────────────────────────
 * Passwords, cookies, session/refresh tokens, signed storage URLs (their
 * `token=` query parameter), file contents, article body text, and personal
 * data such as email addresses. `redact()` is applied to every free-text field
 * as a backstop, and callers are expected to pass identifiers/categories only
 * (never payloads).
 *
 * In a browser the last 60 records are also kept in memory and exposed as
 * `window.__adminDiagnostics()` — one line the operator can paste into the
 * console to hand back the exact failing stage.
 */

export type AdminOp =
  | "upload"
  | "autosave"
  | "save"
  | "publish"
  | "delete"
  | "navigate"
  | "auth";

export type AdminStage =
  | "validate"
  | "sign"
  | "transfer"
  | "verify"
  | "persist"
  | "navigate";

export type AdminOutcome = "ok" | "failed" | "timeout" | "cancelled";

export type AdminEvent = {
  /** What the admin was doing: "upload", "autosave", … */
  op: AdminOp;
  /** Where: "articles", "events", "lawyer-news", … (never user data). */
  section: string;
  /** Which step of the pipeline reached. */
  stage: AdminStage;
  outcome: AdminOutcome;
  /** HTTP status when a response existed. */
  status?: number;
  /** Wall-clock duration of the attempt, in ms. */
  ms?: number;
  /** Short machine-readable cause: "network", "timeout", "http_500", "auth", … */
  category?: string;
  /** Short free-text note. Redacted and truncated; never payload data. */
  detail?: string;
};

const MAX_DETAIL = 160;
const RING_SIZE = 60;

/** Strip anything that could carry a credential out of a log line. */
export function redact(value: string): string {
  return value
    .replace(/([?&]token=)[^&\s]+/gi, "$1<redacted>")
    .replace(/\beyJ[A-Za-z0-9._-]{10,}/g, "<redacted-jwt>")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "<redacted-email>")
    .replace(/\b(sb[pr]_[A-Za-z0-9_-]{6,})/g, "<redacted-key>")
    .slice(0, MAX_DETAIL);
}

type StampedEvent = AdminEvent & { at: string };

const ring: StampedEvent[] = [];

function inBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Human-readable one-liner used both for the console and the ring buffer. */
function format(entry: StampedEvent): string {
  const bits = [
    `op=${entry.op}`,
    `section=${entry.section}`,
    `stage=${entry.stage}`,
    `outcome=${entry.outcome}`,
  ];
  if (entry.status !== undefined) bits.push(`status=${entry.status}`);
  if (entry.ms !== undefined) bits.push(`ms=${Math.round(entry.ms)}`);
  if (entry.category) bits.push(`category=${entry.category}`);
  if (entry.detail) bits.push(`detail="${redact(entry.detail)}"`);
  return `[admin] ${bits.join(" ")}`;
}

/**
 * Record one admin operation outcome.
 *
 * Never throws, and never breaks the operation it is describing — a diagnostic
 * helper that can fail is worse than no diagnostics at all.
 */
export function logAdminEvent(event: AdminEvent): void {
  const entry: StampedEvent = { ...event, at: new Date().toISOString() };
  const line = format(entry);
  try {
    if (event.outcome === "ok") {
      console.info(line);
    } else if (event.outcome === "cancelled") {
      console.info(line);
    } else {
      // Failures are warnings rather than errors: a failed upload is a
      // first-class, recoverable state in this app, not a crash.
      console.warn(line);
    }
  } catch {
    /* console unavailable — ignore */
  }

  if (!inBrowser()) return;
  try {
    ring.push(entry);
    if (ring.length > RING_SIZE) ring.splice(0, ring.length - RING_SIZE);
  } catch {
    /* ignore */
  }
}

/** The recorded events, newest last. Safe to call from anywhere. */
export function adminDiagnosticsEntries(): StampedEvent[] {
  return [...ring];
}

/**
 * Attach `window.__adminDiagnostics()` so an operator who is *not* a developer
 * can produce the evidence that used to be missing: the console then contains
 * the operation, section, stage and status of every recent attempt.
 */
export function installAdminDiagnostics(): void {
  if (!inBrowser()) return;
  try {
    const scope = window as unknown as {
      __adminDiagnostics?: () => string;
    };
    scope.__adminDiagnostics = () =>
      ring.length === 0
        ? "No admin operations recorded yet."
        : ring.map(format).join("\n");
  } catch {
    /* ignore */
  }
}
