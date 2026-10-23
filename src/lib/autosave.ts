/**
 * Autosave — shared primitives used by BOTH the client hook
 * (src/components/forms/kit/use-autosave.ts) and the server actions that
 * persist snapshots.
 *
 * Design notes
 * ------------
 * - Autosave payloads are plain JSON (Record<string, string[]>) — never
 *   files. Image/PDF uploads happen the moment the file is selected
 *   (upload-on-select), so their resulting URL is already a normal field
 *   when the snapshot is taken. This keeps autosave requests small,
 *   replayable and safe to retry (a retry can never re-upload and create
 *   duplicate media).
 * - The server reconstructs a FormData from this record and runs it
 *   through the *same* read/validate helpers the explicit Save action
 *   uses, so autosave and Save can never drift apart in which fields they
 *   persist.
 * - Browser storage (the recovery snapshot) is strictly supplementary: it
 *   only protects work written since the last successful autosave and is
 *   never the system of record.
 */

export type AutosaveData = Record<string, string[]>;

/** Result every autosave server action returns. */
export type AutosaveResult = {
  /** Row id — assigned on the first autosave of a new editor. */
  id: string | null;
  /** Fatal/validation error message, or null on success. */
  error: string | null;
  /** Server-resolved slug (e.g. de-duplicated on conflict); optional. */
  slug?: string | null;
  /**
   * Machine-readable cause behind `error` — `db=23505 constraint=...`.
   *
   * The message the admin sees is deliberately plain English, which means it
   * cannot say *which* constraint refused the write. That distinction is the
   * whole difference between a taken URL and a taken Cover Story, so it is
   * carried separately and logged (never shown in the form).
   */
  errorDetail?: string | null;
};

/** FormData → JSON record. Files are excluded (uploads are pre-resolved). */
export function formDataToData(formData: FormData): AutosaveData {
  const data: AutosaveData = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    (data[key] ??= []).push(value);
  }
  return data;
}

/** JSON record → FormData, so server actions can reuse existing readers. */
export function dataToFormData(data: AutosaveData): FormData {
  const formData = new FormData();
  for (const [key, values] of Object.entries(data)) {
    for (const value of values) formData.append(key, value);
  }
  return formData;
}

/** First value of a field, trimmed; empty → null. Mirrors server readers. */
export function dataString(data: AutosaveData, key: string): string | null {
  const raw = (data[key]?.[0] ?? "").trim();
  return raw.length > 0 ? raw : null;
}

// ───────────────────────────────────────────────────────────────────────────
// Recovery snapshots (localStorage) — supplementary protection only.
// The snapshot holds the id of the draft row (when one exists) plus the
// last payload attempted, so a browser crash/refresh between autosaves can
// restore both the content AND the row it belongs to (no duplicate drafts).
// ───────────────────────────────────────────────────────────────────────────

export const SNAPSHOT_PREFIX = "autosave:snap:v1:";

/**
 * Per-tab editor-session tokens.
 *
 * The snapshot KEY is only the route (`/admin/articles/new`), so every
 * "New …" editor in the browser shares one slot. Without an owner on the
 * snapshot, the next new editor silently adopted the PREVIOUS article's
 * content and — worse — its draft-row id, so publishing it updated (and
 * visually replaced) that earlier, already-published article. This is the
 * production incident this token exists to stop.
 *
 * sessionStorage is the right home for the token: it survives a reload of
 * the same tab (so crash/refresh recovery still works) but is per-tab and
 * dies with the tab, so a second tab can never inherit — or overwrite the
 * meaning of — another editor's recovery copy.
 */
export const SESSION_PREFIX = "autosave:session:v1:";

export type AutosaveSnapshot = {
  id: string | null;
  data: AutosaveData;
  savedAt: number;
  /**
   * The editor-session token that wrote this snapshot. Absent only on
   * snapshots written before this existed, which are therefore never
   * trusted to restore content or adopt a row id.
   */
  token?: string;
};

function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null; // private mode / storage disabled — degrade gracefully
  }
}

export function snapshotKey(scope: string): string {
  return `${SNAPSHOT_PREFIX}${scope}`;
}

/** In-memory fallback when storage is unavailable (private mode, SSR). */
const memorySessions = new Map<string, string>();

function sessionStore(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function randomToken(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * The identity of THIS tab's editor for `scope`, stable across reloads.
 *
 * Two tabs on the same route each get their own token, so neither can adopt
 * the other's content or the row id its autosave created — which is exactly
 * how one article ended up overwriting another.
 */
export function editorSessionToken(scope: string): string {
  const key = `${SESSION_PREFIX}${scope}`;
  const store = sessionStore();
  if (!store) {
    const existing = memorySessions.get(key);
    if (existing) return existing;
    const token = randomToken();
    memorySessions.set(key, token);
    return token;
  }
  try {
    const existing = store.getItem(key);
    if (existing) return existing;
    const token = randomToken();
    store.setItem(key, token);
    return token;
  } catch {
    // Quota/disabled mid-flight: an unusable-but-stable token beats crashing.
    const existing = memorySessions.get(key);
    if (existing) return existing;
    const token = randomToken();
    memorySessions.set(key, token);
    return token;
  }
}

/**
 * Was this snapshot written by this tab's editor?
 *
 * `false` for a snapshot from another tab and for snapshots written before
 * tokens existed; both must be treated as somebody else's work, never
 * restored and never used to adopt a row id.
 */
export function snapshotBelongsToEditor(
  snapshot: AutosaveSnapshot,
  scope: string
): boolean {
  return (
    typeof snapshot.token === "string" &&
    snapshot.token.length > 0 &&
    snapshot.token === editorSessionToken(scope)
  );
}

export function readSnapshot(scope: string): AutosaveSnapshot | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(snapshotKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AutosaveSnapshot;
    if (!parsed || typeof parsed !== "object" || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSnapshot(scope: string, snapshot: AutosaveSnapshot): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(snapshotKey(scope), JSON.stringify(snapshot));
  } catch {
    // Quota exceeded — drop the snapshot rather than break editing.
    try {
      store.removeItem(snapshotKey(scope));
    } catch {
      /* ignore */
    }
  }
}

export function clearSnapshot(scope: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(snapshotKey(scope));
  } catch {
    /* ignore */
  }
}

/** Remove every recovery snapshot (used by admin list pages after a save). */
export function clearAllSnapshots(): void {
  const store = storage();
  if (!store) return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && key.startsWith(SNAPSHOT_PREFIX)) doomed.push(key);
    }
    for (const key of doomed) store.removeItem(key);
  } catch {
    /* ignore */
  }
}
