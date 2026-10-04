"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, Check, Loader2, RotateCcw } from "lucide-react";
import type { AutosaveSnapshot } from "@/lib/autosave";
import { clearAllSnapshots } from "@/lib/autosave";
import type { AutosaveStatus } from "@/components/forms/kit/use-autosave";

/**
 * AutosaveStatus — the small editor status line required by the CMS spec:
 * "Saving…" / "All changes saved" / "Save failed. Retry."
 */
export function AutosaveStatus({
  status,
  lastSavedAt,
  errorMessage,
  onRetry,
}: {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  errorMessage: string | null;
  onRetry: () => void;
}) {
  if (status === "idle") return null;

  const time = lastSavedAt
    ? lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <p
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 font-admin text-xs"
      style={{
        color:
          status === "error"
            ? "var(--color-digest-red)"
            : status === "saved"
              ? "var(--color-stone)"
              : "var(--color-stone)",
      }}
      title={status === "error" && errorMessage ? errorMessage : undefined}
    >
      {status === "saving" ? (
        <>
          <Loader2 size={13} strokeWidth={2.5} className="animate-spin" />
          Saving…
        </>
      ) : status === "saved" ? (
        <>
          <Check size={13} strokeWidth={3} />
          All changes saved{time ? ` · ${time}` : ""}
        </>
      ) : status === "error" ? (
        <>
          <AlertCircle size={13} strokeWidth={2.5} />
          Save failed.
          <button
            type="button"
            onClick={onRetry}
            className="font-semibold underline underline-offset-2 hover:opacity-70"
          >
            Retry.
          </button>
          {errorMessage ? (
            <span className="max-w-[24ch] truncate text-digest-red/70">
              {errorMessage}
            </span>
          ) : null}
        </>
      ) : (
        <>
          <span className="block h-1.5 w-1.5 rounded-full bg-stone/50" />
          Unsaved changes…
        </>
      )}
    </p>
  );
}

/**
 * SaveButtons — explicit Save / Publish / Move to Draft actions.
 *
 * Both buttons first flush any pending autosave (so nothing typed in the
 * last few hundred ms is lost) and then submit the form with a `save_mode`
 * the server action interprets:
 *   save      → persist everything, publication state unchanged
 *               (drafts stay drafts — creating never publishes)
 *   publish   → persist + validate + set status published + revalidate
 *   unpublish → persist + set status back to draft/pending
 *
 * Enter-key implicit submits fall through to the hidden save_mode default
 * ("save"), so a stray Enter can never publish.
 */
export function SaveButtons({
  formRef,
  flush,
  isPending,
  saveLabel = "Save",
  publishLabel = "Publish",
  unpublishLabel = "Move to Draft",
  showPublish = true,
  showUnpublish = false,
  statusSlot,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  flush: (options?: { pause?: boolean }) => Promise<void>;
  isPending: boolean;
  saveLabel?: string;
  publishLabel?: string;
  unpublishLabel?: string;
  showPublish?: boolean;
  showUnpublish?: boolean;
  statusSlot?: React.ReactNode;
}) {
  // `save_mode` MUST be React-controlled state, not an imperatively-set
  // uncontrolled value. This was a real, reproduced publishing defect: the
  // submit handler set the hidden input to "publish" and then `await`ed the
  // flush; React re-wrote the uncontrolled input's defaultValue back to
  // "save" during that window, the form submitted with save_mode="save", and
  // the article was silently left as a DRAFT (the "it keeps asking me to
  // publish" report). A controlled value is rewritten by React to the correct
  // mode on every commit, so the race cannot happen.
  const [mode, setMode] = useState<"save" | "publish" | "unpublish">("save");
  const [flushing, setFlushing] = useState(false);
  const busy = isPending || flushing;

  const submit = async (next: "save" | "publish" | "unpublish") => {
    if (busy) return;
    const form = formRef.current;
    if (!form) return;
    setMode(next);
    setFlushing(true);
    try {
      await flush({ pause: true });
      // Belt-and-braces: also write the DOM value immediately before submit,
      // in case React has not committed the state update yet. Both paths agree
      // on `next`, so this can never disagree with the controlled value.
      const modeInput = form.querySelector<HTMLInputElement>(
        'input[name="save_mode"]'
      );
      if (modeInput) modeInput.value = next;
      form.requestSubmit();
    } finally {
      setFlushing(false);
    }
  };

  const base =
    "relative inline-flex items-center justify-center gap-2 px-7 py-3 font-admin text-sm font-semibold uppercase tracking-[0.1em] transition-colors disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="save_mode" value={mode} readOnly />
      <div className="flex flex-wrap items-center gap-3">
        <motion.button
          type="button"
          disabled={busy}
          whileTap={busy ? undefined : { scale: 0.985 }}
          onClick={() => void submit("save")}
          className={`${base} text-paper`}
          style={{ backgroundColor: "var(--color-digest-red)", borderRadius: 2 }}
        >
          {isPending ? "Saving…" : flushing ? "Saving…" : saveLabel}
        </motion.button>

        {showPublish ? (
          <motion.button
            type="button"
            disabled={busy}
            whileTap={busy ? undefined : { scale: 0.985 }}
            onClick={() => void submit("publish")}
            className={`${base} border border-ink bg-transparent text-ink hover:bg-ink hover:text-paper`}
            style={{ borderRadius: 2 }}
          >
            {publishLabel}
          </motion.button>
        ) : null}

        {showUnpublish ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit("unpublish")}
            className={`${base} px-3 text-stone underline-offset-4 hover:underline disabled:opacity-70`}
          >
            {unpublishLabel}
          </button>
        ) : null}

        {statusSlot}
      </div>
    </div>
  );
}

/**
 * AutosaveRecoveryBanner — shown on edit pages when the browser holds a
 * local snapshot newer than what the form was rendered with (e.g. the tab
 * crashed before the last autosave landed). Recovering re-applies the
 * snapshot to the form; the next autosave then persists it to the server.
 */
export function AutosaveRecoveryBanner({
  recovery,
  onRecover,
  onDismiss,
}: {
  recovery: AutosaveSnapshot | null;
  onRecover: () => void;
  onDismiss: () => void;
}) {
  if (!recovery) return null;
  const when = new Date(recovery.savedAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border border-hairline bg-hairline/30 px-4 py-3"
      style={{ borderRadius: 2 }}
    >
      <p className="font-admin text-xs text-ink">
        Recover unsaved changes from {when}?
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRecover}
          className="inline-flex items-center gap-1.5 bg-digest-red px-4 py-2 font-admin text-[11px] font-semibold uppercase tracking-[0.1em] text-paper"
          style={{ borderRadius: 2 }}
        >
          <RotateCcw size={12} strokeWidth={2.5} />
          Recover
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 py-2 font-admin text-[11px] font-semibold uppercase tracking-[0.1em] text-stone hover:text-ink"
        >
          Discard
        </button>
      </div>
    </div>
  );
}

/**
 * AutosaveSessionGC — mounted on admin list pages. Successful saves land
 * here, so clearing local recovery snapshots on arrival stops the next
 * "New" editor from resurrecting content that is already safely saved.
 */
export function AutosaveSessionGC() {
  useEffect(() => {
    clearAllSnapshots();
  }, []);
  return null;
}
