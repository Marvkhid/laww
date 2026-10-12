/**
 * Request-body limits — one place, one reason.
 *
 * ── The wall this module exists for ─────────────────────────────────────────
 * The production deployment runs on Vercel, which rejects any Function request
 * body of 4 500 000 bytes or more *before the Function runs*:
 *
 *   HTTP/2 413 · `Request Entity Too Large` · `FUNCTION_PAYLOAD_TOO_LARGE`
 *
 * Measured directly against the deployment by POSTing known-size bodies to a
 * GET-only public route (no handler runs, nothing is written):
 *
 *   10 KB · 4 000 000 B · 4 400 000 B → 405 (accepted, route answered)
 *   4 500 000 B and above            → 413 FUNCTION_PAYLOAD_TOO_LARGE
 *
 * `serverActions.bodySizeLimit` governs only Next.js's own parsing and cannot
 * raise that ceiling. So the app's job is to stay well below it — and to fail
 * with its own visible message before an oversized request is ever built.
 *
 * ── The three layers, all below the wall ────────────────────────────────────
 *  1. ACTION_BODY_LIMIT (applied in next.config.ts) — the framework ceiling for
 *     every Server Action, which is the only handler on this site that reads a
 *     body. Nothing legitimate comes close: uploads now go straight from the
 *     browser to Supabase Storage, so no request carries file bytes.
 *  2. CLIENT_PAYLOAD_LIMIT_BYTES — what the editor itself refuses to send
 *     (autosave snapshot or explicit Save), with an actionable message.
 *  3. PUBLIC_FIELD_LIMITS — per-field caps on the public endpoints that accept
 *     free text, mirrored by `maxLength` on the inputs.
 */

/** Measured production ceiling: bodies at or above this are rejected with 413. */
export const PLATFORM_BODY_WALL_BYTES = 4_500_000;

/**
 * Next.js Server Action ceiling — the value in next.config.ts.
 *
 * Kept 2 MB so the app answers first, with its own error, long before the host
 * would. It has to stay below PLATFORM_BODY_WALL_BYTES to be able to do that,
 * and it must be generous enough for the largest legitimate payload: a long
 * article's rich-text JSON plus its metadata, which is tens of KB — never MB.
 */
export const ACTION_BODY_LIMIT = "2mb";
export const ACTION_BODY_LIMIT_BYTES = 2 * 1024 * 1024;

/**
 * Largest payload the admin editor will itself send — autosave or Save.
 *
 * Deliberately below ACTION_BODY_LIMIT_BYTES so the client, not the framework,
 * is what refuses an oversized request: the hook can then explain what to do
 * rather than surfacing an opaque rejected fetch.
 */
export const CLIENT_PAYLOAD_LIMIT_BYTES = 1_500_000;

/** Byte length of a payload exactly as it will be serialised. */
export function jsonByteLength(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    // Unserialisable (circular, or a value JSON cannot represent): treat it as
    // too large so the request is never sent blind.
    return Number.MAX_SAFE_INTEGER;
  }
}

/** Human-readable MB for a byte count, e.g. 1.5 for 1_572_864. */
function megabytes(bytes: number): string {
  return (bytes / 1_000_000).toFixed(1);
}

/** The message shown when the editor refuses to send an oversized payload. */
export function payloadTooLargeMessage(bytes: number): string {
  return (
    `This entry is too large to save (${megabytes(bytes)} MB — the limit is ` +
    `${megabytes(CLIENT_PAYLOAD_LIMIT_BYTES)} MB per save). Shorten it, or ` +
    `split it into separate entries, then save again. Your work is still ` +
    `here and nothing has been lost.`
  );
}

/**
 * Per-field caps for the public forms that accept free text.
 *
 * The server is the authority; the matching `maxLength` attributes on the
 * inputs are only there to make the cap visible before submitting. Without
 * these, a single field can grow until the request becomes a 413 the visitor
 * cannot interpret.
 */
export const PUBLIC_FIELD_LIMITS = {
  name: 100,
  email: 254, // RFC 5321 maximum address length
  subject: 200,
  category: 60,
  message: 5_000,
} as const;

export function fieldLimitMessage(label: string, max: number): string {
  return `${label} is too long — ${max.toLocaleString("en-US")} characters is the maximum.`;
}

/**
 * First violated cap in `[label, value, max]` order, or null when all pass.
 * One call per action keeps the checks in a fixed order and in one place.
 */
export function exceededLimitMessage(
  entries: ReadonlyArray<readonly [label: string, value: string, max: number]>
): string | null {
  for (const [label, value, max] of entries) {
    if (value.length > max) return fieldLimitMessage(label, max);
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// Limits policy — enforced, not documented
//
// The 413 happened because a configuration value (“50mb”), the host's real
// ceiling (4.5 MB) and the app's advertised limits (5 MB images, 30 MB PDFs)
// disagreed, and nothing noticed. These functions make the disagreement a
// failure instead of a surprise:
//
//   • assertRequestLimits() throws, and next.config.ts calls it — so a bad
//     limit fails `next build` (and `next dev`) immediately.
//   • e2e/body-limits.spec.ts runs the same checks plus the structural ones
//     (no server action reads file bytes, no file input outside the upload
//     kit, the editor guard still present) in `npm run test:e2e`.
//
// Both are pure so the guard itself can be tested with hostile values rather
// than only being trusted.
// ───────────────────────────────────────────────────────────────────────────

/**
 * The largest Server Action body this project will ever accept, in bytes.
 *
 * A ceiling *below* the host's wall is the whole point (see the file header):
 * raising this is a deliberate architectural change, not a tuning knob.
 */
export const MAX_ACTION_BODY_BYTES = 2 * 1024 * 1024;

/**
 * Parse a Next.js size label (“2mb”, “512kb”, “1gb”) into bytes.
 *
 * Mirrors the `bytes` package Next.js uses for `bodySizeLimit` (1024-based
 * units), which is why “2mb” is 2 097 152 and not 2 000 000.
 */
export function parseSizeToBytes(label: string): number {
  const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/i.exec(label.trim());
  if (!match) {
    throw new Error(
      `[request-limits] Unparseable size label: ${JSON.stringify(label)}. ` +
        `Use a value like "2mb" or "512kb".`
    );
  }
  const scale: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
  };
  return Number(match[1]) * scale[match[2].toLowerCase()];
}

export type LimitSet = {
  /** The config label handed to Next.js, e.g. ACTION_BODY_LIMIT. */
  actionLabel: string;
  /** The numeric constant that must describe the same ceiling. */
  actionBytes: number;
  /** What the editor refuses to send. */
  clientBytes: number;
  /** The host's measured request-body ceiling. */
  wallBytes: number;
  /** The largest action body this project allows itself. */
  maxActionBytes: number;
};

/** Every way a limit set can be unsafe, as human-readable sentences. */
export function requestLimitViolations(limits: LimitSet): string[] {
  const problems: string[] = [];
  let parsed: number | null = null;
  try {
    parsed = parseSizeToBytes(limits.actionLabel);
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error));
  }

  if (parsed !== null && parsed !== limits.actionBytes) {
    problems.push(
      `ACTION_BODY_LIMIT (${limits.actionLabel} = ${parsed} bytes) and ` +
        `ACTION_BODY_LIMIT_BYTES (${limits.actionBytes}) disagree — they must describe the same ceiling.`
    );
  }
  if (limits.clientBytes <= 0) {
    problems.push("CLIENT_PAYLOAD_LIMIT_BYTES must be positive.");
  }
  if (limits.clientBytes >= limits.actionBytes) {
    problems.push(
      `CLIENT_PAYLOAD_LIMIT_BYTES (${limits.clientBytes}) must be BELOW ` +
        `ACTION_BODY_LIMIT_BYTES (${limits.actionBytes}), so the editor refuses an oversized ` +
        `payload before the framework has to.`
    );
  }
  if (limits.actionBytes > limits.maxActionBytes) {
    problems.push(
      `ACTION_BODY_LIMIT_BYTES (${limits.actionBytes}) exceeds the project ceiling ` +
        `MAX_ACTION_BODY_BYTES (${limits.maxActionBytes}). Raising it is an architectural ` +
        `change: uploads must keep going straight to storage, never through a Server Action.`
    );
  }
  if (limits.actionBytes >= limits.wallBytes) {
    problems.push(
      `ACTION_BODY_LIMIT_BYTES (${limits.actionBytes}) must stay BELOW the host ceiling ` +
        `PLATFORM_BODY_WALL_BYTES (${limits.wallBytes}) — at or above it the host answers 413 ` +
        `before the app can produce a useful error.`
    );
  }
  return problems;
}

/**
 * Throw when the shipped limits are unsafe.
 *
 * Called from next.config.ts, so an unsafe configuration fails the build. The
 * messages name the constant to fix and why it matters, because the person who
 * sees this is usually changing it on purpose.
 */
export function assertRequestLimits(): void {
  const problems = requestLimitViolations({
    actionLabel: ACTION_BODY_LIMIT,
    actionBytes: ACTION_BODY_LIMIT_BYTES,
    clientBytes: CLIENT_PAYLOAD_LIMIT_BYTES,
    wallBytes: PLATFORM_BODY_WALL_BYTES,
    maxActionBytes: MAX_ACTION_BODY_BYTES,
  });
  if (problems.length > 0) {
    throw new Error(
      `[request-limits] Unsafe request-body limits:\n  - ${problems.join("\n  - ")}\n` +
        `Fix src/lib/request-limits.ts. See e2e/body-limits.spec.ts for the invariant this protects.`
    );
  }
}
