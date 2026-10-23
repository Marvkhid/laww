"use client";

/**
 * useAutosave — the admin dashboard's automatic draft-saving engine.
 *
 * Behaviour contract (see the CMS reliability spec):
 *  - Debounced snapshots (default 800 ms after typing stops) posted to a
 *    server action that reuses the SAME field readers as explicit Save.
 *  - Single-flight, strictly ordered requests: a snapshot is only ever
 *    sent after the previous one has resolved, so an older, slower
 *    request can never overwrite a newer edit.
 *  - A brand-new editor creates its draft row on the first snapshot and
 *    adopts the returned id (kept in a hidden form field + the local
 *    recovery snapshot) so no duplicate drafts are ever produced.
 *  - Autosave NEVER touches publication state — the server actions force
 *    draft status on create and preserve current status on update.
 *  - Explicit Save/Publish flush pending work first (flush()).
 *  - Failures keep the payload, surface "Save failed. Retry.", retry with
 *    backoff, and preserve a local recovery snapshot.
 *  - A `reset` listener cancels React's post-action form reset so hidden
 *    fields (rich-text body, resolved upload URLs) are never silently
 *    wiped after a failed Save — the root cause of "content disappeared
 *    after clicking Save".
 *  - EVERY request is now bounded (SAVE_TIMEOUT_MS). The hook is strictly
 *    single-flight: snapshot N+1 is only sent after snapshot N settles, so a
 *    request that never returned used to wedge the chain permanently — the
 *    editor said "Saving…" forever, Save/Publish queued behind the same chain
 *    and never submitted, and the redirect never happened. A browser `fetch`
 *    has no default timeout, so nothing bounded it. A timeout is treated as a
 *    retryable failure: the work stays dirty, the recovery snapshot is kept,
 *    the backoff retry runs, and an explicit Save always gets through.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  installAdminDiagnostics,
  logAdminEvent,
} from "@/lib/admin-diagnostics";
import {
  clearAllSnapshots,
  clearSnapshot,
  editorSessionToken,
  formDataToData,
  readSnapshot,
  snapshotBelongsToEditor,
  writeSnapshot,
  type AutosaveData,
  type AutosaveResult,
  type AutosaveSnapshot,
} from "@/lib/autosave";
import {
  CLIENT_PAYLOAD_LIMIT_BYTES,
  jsonByteLength,
  payloadTooLargeMessage,
} from "@/lib/request-limits";
import { conflictCategoryFromDetail } from "@/lib/slug-allocation";

export type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export interface UseAutosaveOptions {
  /** The <form> the hook binds to. */
  formRef: React.RefObject<HTMLFormElement | null>;
  /** Server action that persists one snapshot. id === null creates the draft row. */
  save: (id: string | null, data: AutosaveData) => Promise<AutosaveResult>;
  /** Row id for edit pages, so the first snapshot updates instead of creating. */
  initialId?: string | null;
  /** Skip snapshotting while required fields are missing (mirrors server validation). */
  skip?: (data: AutosaveData) => boolean;
  /** Fired once, when a brand-new draft row is created. */
  onDraftCreated?: (id: string) => void;
  /** Fired when the server resolved a different slug (conflict de-duplication). */
  onSlugResolved?: (slug: string) => void;
  /**
   * true  → new-editor pages: silently restore the local recovery snapshot
   *         on mount (content + draft id).
   * false → edit pages: expose `recovery` so the form can offer a banner.
   */
  autoRecover?: boolean;
  enabled?: boolean;
  debounceMs?: number;
}

const MAX_AUTO_RETRIES = 3;

/**
 * Bound on ONE snapshot request.
 *
 * Generous (a snapshot is a few KB of JSON) but finite, because an unbounded
 * request is exactly how the editor got stuck: the single-flight chain waits
 * for the previous snapshot, so one request that never settles stops every
 * later save and the Save/Publish redirect with it.
 */
const SAVE_TIMEOUT_MS = 20_000;

/** Resolve/reject with `promise`, but never wait longer than `ms`. */
function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          "Saving is taking longer than expected — the connection may have stalled. Your changes are still here; retrying…"
        )
      );
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/** "/admin/lawyer-news/new" → "lawyer-news". Used only for diagnostics. */
function sectionFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  return segments[1] ?? "admin";
}

function applyDataToForm(form: HTMLFormElement, data: AutosaveData): void {
  const escape = (value: string) =>
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(value)
      : value.replace(/["\\]/g, "\\$&");

  for (const [name, values] of Object.entries(data)) {
    const elements = form.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >(`[name="${escape(name)}"]`);
    elements.forEach((element) => {
      if (
        element instanceof HTMLInputElement &&
        (element.type === "checkbox" || element.type === "radio")
      ) {
        element.checked = values.includes(element.value);
      } else if (element instanceof HTMLInputElement && element.type === "file") {
        return; // files cannot be restored; uploads resolve before snapshotting
      } else {
        element.value = values[0] ?? "";
      }
      // Drive React's onChange so component state re-syncs with the DOM.
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  // Rich-text editors listen for this and rehydrate their own hidden field.
  form.dispatchEvent(
    new CustomEvent("autosave:restore", { detail: { data }, bubbles: true })
  );
}

export function useAutosave({
  formRef,
  save,
  initialId = null,
  skip,
  onDraftCreated,
  onSlugResolved,
  autoRecover = false,
  enabled = true,
  debounceMs = 800,
}: UseAutosaveOptions) {
  const pathname = usePathname();
  const scopeRef = useRef(pathname);
  scopeRef.current = pathname;

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(initialId);
  const [recovery, setRecovery] = useState<AutosaveSnapshot | null>(null);

  const idRef = useRef<string | null>(initialId);
  const seqRef = useRef(0);
  const dirtyRef = useRef(false);
  const pausedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());
  const mountedRef = useRef(true);
  const lastPayloadRef = useRef<AutosaveData | null>(null);
  /** Number of snapshots currently in flight (create-or-update requests). */
  const activeRef = useRef(0);
  /** Set while an onSubmit is already waiting to re-submit. */
  const submittingRef = useRef(false);

  // Callbacks kept in refs so the bind effect never re-runs.
  const saveRef = useRef(save);
  saveRef.current = save;
  const skipRef = useRef(skip);
  skipRef.current = skip;
  const onDraftCreatedRef = useRef(onDraftCreated);
  onDraftCreatedRef.current = onDraftCreated;
  const onSlugResolvedRef = useRef(onSlugResolved);
  onSlugResolvedRef.current = onSlugResolved;

  const collect = useCallback((): AutosaveData | null => {
    const form = formRef.current;
    if (!form) return null;
    const data = formDataToData(new FormData(form));
    lastPayloadRef.current = data;
    return data;
  }, [formRef]);

  /**
   * Mirror the draft id into the form's `autosave_id` field *imperatively*.
   *
   * The field is also React-controlled, but an explicit Save/Publish flushes
   * pending work first and then reads the id straight out of the DOM. If
   * React had not committed the state update from a just-created draft yet,
   * the form would submit an empty id and the server would create a SECOND
   * row — the duplicate-article defect. Writing the DOM here (and letting
   * React's later commit write the same value) removes that race entirely.
   */
  const syncIdField = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const field = form.querySelector<HTMLInputElement>(
      'input[name="autosave_id"]'
    );
    if (field) field.value = idRef.current ?? "";
  }, [formRef]);

  const writeSnapshotNow = useCallback((data?: AutosaveData | null) => {
    const payload = data ?? lastPayloadRef.current;
    if (!payload) return;
    writeSnapshot(scopeRef.current, {
      id: idRef.current,
      data: payload,
      savedAt: Date.now(),
      token: editorSessionToken(scopeRef.current),
    });
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Enqueue one snapshot onto the single-flight chain. */
  const enqueue = useCallback(
    async (data?: AutosaveData | null): Promise<void> => {
      const payload = data ?? collect();
      if (!payload) return;
      if (skipRef.current?.(payload)) {
        // Required fields not filled in yet — wait for more input; not an error.
        return;
      }

      // Refuse to build a request the host will reject. The production host
      // caps a Function request body at 4 500 000 bytes (measured: 4 400 000 B
      // → 405, 4 500 000 B → 413 FUNCTION_PAYLOAD_TOO_LARGE) and Next.js caps a
      // Server Action below that — an autosave heavy enough to reach either
      // limit must fail HERE, with a message that says what to do, instead of
      // as an opaque rejected fetch.
      const payloadBytes = jsonByteLength(payload);
      if (payloadBytes > CLIENT_PAYLOAD_LIMIT_BYTES) {
        pausedRef.current = true; // no retry storm: a person must shorten it
        dirtyRef.current = true; // the work is still unsaved
        writeSnapshotNow(payload); // and never lost — recovery copy first
        setStatus("error");
        setErrorMessage(payloadTooLargeMessage(payloadBytes));
        logAdminEvent({
          op: "autosave",
          section: sectionFromPath(scopeRef.current),
          stage: "validate", // rejected before any request was built
          outcome: "failed",
          category: "too_large",
          detail: `${payloadBytes} bytes (client limit ${CLIENT_PAYLOAD_LIMIT_BYTES})`,
        });
        return;
      }
      // This payload now represents the newest known state; clear the dirty
      // flag so a completion can tell whether newer edits arrived mid-flight.
      dirtyRef.current = false;
      const seq = ++seqRef.current;
      setStatus("saving");
      setErrorMessage(null);

      // Counted synchronously, before any await: a form submit that fires
      // in this window must be able to see that a request is still open.
      activeRef.current += 1;
      const task = chainRef.current.then(async () => {
        const hadId = idRef.current !== null;
        const startedAt = Date.now();
        try {
          const result = await withDeadline(
            saveRef.current(idRef.current, payload),
            SAVE_TIMEOUT_MS
          );
          if (result && result.error) {
            // Carry the machine-readable cause alongside the admin-facing
            // message. The message is deliberately plain English, so on its
            // own it cannot say WHICH constraint refused the write — and that
            // distinction is the whole difference between a taken URL and a
            // taken Cover Story (see lib/slug-allocation).
            const failure = new Error(result.error) as Error & {
              adminDetail?: string | null;
            };
            failure.adminDetail = result.errorDetail ?? null;
            throw failure;
          }
          logAdminEvent({
            op: "autosave",
            section: sectionFromPath(scopeRef.current),
            stage: "persist",
            outcome: "ok",
            ms: Date.now() - startedAt,
            category: hadId ? "update" : "create",
          });
          // Adopt any id the server hands back that differs from the one we
          // hold. Previously this only ran when we held NO id, which meant a
          // stale id (a draft deleted in another tab, or one named by a local
          // recovery snapshot) could never be replaced: every autosave kept
          // failing against a row that no longer existed.
          if (result?.id && result.id !== idRef.current) {
            idRef.current = result.id;
            setDraftId(result.id);
            syncIdField();
            if (!hadId) onDraftCreatedRef.current?.(result.id);
          }
          if (result?.slug) onSlugResolvedRef.current?.(result.slug);
          writeSnapshotNow(payload);
          if (!mountedRef.current || seq !== seqRef.current) return;
          retryCountRef.current = 0;
          if (dirtyRef.current) {
            setStatus("saving"); // newer edits already queued behind us
          } else {
            setStatus("saved");
            setLastSavedAt(new Date());
          }
        } catch (error) {
          if (!mountedRef.current || seq !== seqRef.current) return;
          const message =
            error instanceof Error && error.message
              ? error.message
              : "Could not save your changes.";
          const dbDetail =
            error instanceof Error && "adminDetail" in error
              ? ((error as Error & { adminDetail?: string | null }).adminDetail ??
                null)
              : null;
          const conflict = conflictCategoryFromDetail(dbDetail);
          logAdminEvent({
            op: "autosave",
            section: sectionFromPath(scopeRef.current),
            stage: "persist",
            outcome: "failed",
            ms: Date.now() - startedAt,
            category: conflict ? `${conflict}_conflict` : "save_failed",
            // The database code goes FIRST so the 160-character cap in
            // logAdminEvent can never truncate away the one part that makes
            // the failure diagnosable.
            detail: dbDetail ? `${dbDetail} :: ${message}` : message,
          });
          setStatus("error");
          setErrorMessage(message);
          writeSnapshotNow(payload); // keep local recovery copy
          dirtyRef.current = true; // the work is still unsaved
          // Bounded backoff; manual Retry() is always available.
          if (retryCountRef.current < MAX_AUTO_RETRIES) {
            retryCountRef.current += 1;
            const delay = 2000 * 2 ** (retryCountRef.current - 1);
            if (retryTimerRef.current !== null)
              window.clearTimeout(retryTimerRef.current);
            retryTimerRef.current = window.setTimeout(() => {
              retryTimerRef.current = null;
              if (mountedRef.current && !pausedRef.current) void enqueue();
            }, delay);
          }
        }
      });
      void task.finally(() => {
        activeRef.current = Math.max(0, activeRef.current - 1);
      });
      chainRef.current = task.catch(() => undefined);
      await task;
    },
    [collect, syncIdField, writeSnapshotNow]
  );

  const schedule = useCallback(() => {
    if (pausedRef.current) return;
    clearTimers();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      // Collect first so the snapshot always holds the newest keystrokes.
      const data = collect();
      writeSnapshotNow(data);
      void enqueue(data);
    }, debounceMs);
  }, [clearTimers, debounceMs, collect, enqueue, writeSnapshotNow]);

  const markDirty = useCallback(() => {
    if (!enabled) return;
    pausedRef.current = false;
    dirtyRef.current = true;
    setStatus((current) => (current === "saving" ? current : "dirty"));
    schedule();
  }, [enabled, schedule]);

  /** Cancel the debounce and resolve once every queued snapshot has settled. */
  const flush = useCallback(
    async (options?: { pause?: boolean }) => {
      clearTimers();
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (options?.pause) pausedRef.current = true;
      if (dirtyRef.current || status === "error") {
        const data = collect();
        writeSnapshotNow(data);
        await enqueue(data);
      } else {
        await chainRef.current;
      }
    },
    [clearTimers, collect, enqueue, status, writeSnapshotNow]
  );

  const retry = useCallback(() => {
    pausedRef.current = false;
    retryCountRef.current = 0;
    dirtyRef.current = true;
    void enqueue();
  }, [enqueue]);

  const recover = useCallback(() => {
    const snapshot = readSnapshot(scopeRef.current);
    const form = formRef.current;
    if (!snapshot || !form) return;
    // Belt and braces: the banner only appears after a token check, but a
    // stale `recovery` must never be able to adopt a foreign row id.
    if (!snapshotBelongsToEditor(snapshot, scopeRef.current)) {
      clearSnapshot(scopeRef.current);
      setRecovery(null);
      return;
    }
    if (snapshot.id) {
      idRef.current = snapshot.id;
      setDraftId(snapshot.id);
      syncIdField();
      onDraftCreatedRef.current?.(snapshot.id);
    }
    applyDataToForm(form, snapshot.data);
    lastPayloadRef.current = snapshot.data;
    setRecovery(null);
    dirtyRef.current = true;
    schedule();
  }, [formRef, schedule, syncIdField]);

  const dismissRecovery = useCallback(() => {
    clearSnapshot(scopeRef.current);
    setRecovery(null);
  }, []);

  /**
   * Broadcast the save status so other admin components can tell the truth.
   *
   * The upload zones use it to replace a permanently optimistic "Uploaded —
   * saving…" with the real outcome (see image-upload.tsx).
   */
  useEffect(() => {
    installAdminDiagnostics();
    window.dispatchEvent(
      new CustomEvent("autosave:status", { detail: { status, errorMessage } })
    );
  }, [status, errorMessage]);

  // ── Bind to the form once ────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    const form = formRef.current;
    if (!form) return;

    const onFormInput = () => markDirty();
    const onFormChange = () => markDirty();

    // Never let a form reset (React resets forms after actions) wipe the
    // rich-text hidden field or resolved upload URLs — this silently
    // destroyed body text and images after a failed Save.
    const preventReset = (event: Event) => event.preventDefault();

    /**
     * An explicit Save/Publish is about to persist everything itself:
     * stop queued autosaves from racing it.
     *
     * It must ALSO not race an autosave that is still in flight. If a request
     * is open, the form still holds an empty or stale `autosave_id`, so the
     * server would take the "no id" path and create a SECOND record — the
     * duplicate-content defect (reproduced: a native-submit content type
     * produced two rows for one fill-in). Wait for the chain to settle — which
     * writes the real id into the form — then submit exactly once.
     */
    const onSubmit = (event: Event) => {
      clearTimers();
      pausedRef.current = true;

      // This IS our own re-submit, coming back from `requestSubmit()` below.
      // Clear the guard here — not in the `finally` block before the
      // re-submit is dispatched — and let the submit proceed.
      //
      // Clearing it too early was an infinite loop: a FAILED autosave leaves
      // `dirtyRef` true, so on re-entry the guard was already down, the
      // "nothing to wait for" test failed, and the handler cancelled the
      // submit again. The user's Save/Publish button therefore spun forever
      // and nothing was ever written. The guard has to stay up across
      // exactly one re-submit, and the explicit Save must always get through
      // even when autosave is failing.
      if (submittingRef.current) {
        submittingRef.current = false;
        return;
      }

      // Same cap for an explicit Save/Publish: refuse to build an oversized
      // request and say why, instead of letting the framework answer with an
      // error the editor cannot explain. The payload is preserved in the
      // localStorage snapshot first, so nothing typed is lost.
      const submitPayload = collect();
      const submitBytes = submitPayload ? jsonByteLength(submitPayload) : 0;
      if (submitPayload && submitBytes > CLIENT_PAYLOAD_LIMIT_BYTES) {
        event.preventDefault();
        pausedRef.current = true;
        dirtyRef.current = true;
        writeSnapshotNow(submitPayload);
        setStatus("error");
        setErrorMessage(payloadTooLargeMessage(submitBytes));
        return;
      }

      if (activeRef.current === 0 && !dirtyRef.current) return;

      event.preventDefault();
      submittingRef.current = true;
      void (async () => {
        try {
          // Flush any pending edit, then wait for every queued request to
          // settle so the payload carries the id of the row autosave created.
          await flush();
        } catch {
          // Autosave failures are surfaced by the status line; the user's
          // explicit Save must still be allowed to run.
        } finally {
          form.requestSubmit();
        }
      })();
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || timerRef.current !== null) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    /**
     * A DISCRETE, already-completed change (an image upload resolving, an image
     * being deleted) is not typing, so it must not sit in the debounce window.
     *
     * Leaving it there was a genuine way to lose an upload: the user uploads,
     * immediately navigates away, the pending timer is cancelled by the
     * unload, and the best-effort save in the cleanup below is a
     * fire-and-forget request the browser is free to drop. Saving immediately
     * removes that window entirely.
     */
    const onFlushRequest = () => {
      if (pausedRef.current || !enabled) return;
      clearTimers();
      const data = collect();
      writeSnapshotNow(data);
      void enqueue(data);
    };

    form.addEventListener("input", onFormInput);
    form.addEventListener("change", onFormChange);
    form.addEventListener("reset", preventReset);
    form.addEventListener("submit", onSubmit);
    form.addEventListener("autosave:flush", onFlushRequest);
    window.addEventListener("beforeunload", onBeforeUnload);

    // ── Recovery on mount ─────────────────────────────────────────────────
    // A snapshot only belongs to THIS editor when it was written by this
    // tab's editor session. The snapshot key is just the route, so before
    // this check every "/new" editor shared one slot: the next new article
    // silently adopted the previous article's content AND its draft-row id,
    // and publishing it REPLACED that already-published article (the reported
    // production defect). Another tab's snapshot — and any snapshot written
    // before tokens existed — is left alone and never adopted.
    const snapshot = readSnapshot(scopeRef.current);
    if (snapshot && Object.keys(snapshot.data).length > 0) {
      const ours = snapshotBelongsToEditor(snapshot, scopeRef.current);
      // A legacy (un-tokened) snapshot is from an older deploy: drop it so
      // it cannot keep resurrecting an old article into a fresh editor.
      if (!ours && !snapshot.token) clearSnapshot(scopeRef.current);
      // A snapshot only belongs to this editor when it references the same
      // row — or any row, when this editor has not created one yet.
      const sameRow = ours && (idRef.current === null || snapshot.id === idRef.current);
      if (sameRow) {
        if (autoRecover) {
          if (snapshot.id) {
            idRef.current = snapshot.id;
            setDraftId(snapshot.id);
            syncIdField();
            onDraftCreatedRef.current?.(snapshot.id);
          }
          applyDataToForm(form, snapshot.data);
          lastPayloadRef.current = snapshot.data;
          dirtyRef.current = true;
          schedule();
        } else {
          setRecovery(snapshot);
        }
      } else if (ours) {
        clearSnapshot(scopeRef.current);
      }
    }

    return () => {
      mountedRef.current = false;
      form.removeEventListener("input", onFormInput);
      form.removeEventListener("change", onFormChange);
      form.removeEventListener("reset", preventReset);
      form.removeEventListener("submit", onSubmit);
      form.removeEventListener("autosave:flush", onFlushRequest);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimers();
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      // Navigating away with unsaved work: keep a recovery snapshot and
      // fire one last best-effort save. The form may already be detached,
      // so fall back to the last known payload.
      if (dirtyRef.current && enabled) {
        const payload = formRef.current
          ? formDataToData(new FormData(formRef.current))
          : lastPayloadRef.current;
        if (payload && !skipRef.current?.(payload)) {
          writeSnapshot(scopeRef.current, {
            id: idRef.current,
            data: payload,
            savedAt: Date.now(),
            token: editorSessionToken(scopeRef.current),
          });
          // Never fire a request the host would reject with 413. On the way out
          // the recovery snapshot written above is the protection that matters;
          // an oversized request would only add a guaranteed failure.
          if (jsonByteLength(payload) <= CLIENT_PAYLOAD_LIMIT_BYTES) {
            void saveRef.current(idRef.current, payload).catch(() => undefined);
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    lastSavedAt,
    errorMessage,
    draftId,
    flush,
    retry,
    recovery,
    recover,
    dismissRecovery,
    /** Usually unnecessary — admin list pages clear snapshots after a save. */
    clearAllSnapshots,
  };
}
