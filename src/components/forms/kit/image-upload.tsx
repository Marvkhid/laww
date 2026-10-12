"use client";

import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { ImagePlus, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { UploadResult } from "@/lib/upload-client";
import { IMAGE_MAX_LABEL } from "@/lib/upload-limits";
import {
  beginUploadActivity,
  endUploadActivity,
} from "@/lib/upload-activity";

/**
 * Premium image upload zone.
 *
 * Renders a visually-hidden native file input with the given `name`, so the
 * form's server action receives the exact same FormData fields as before.
 * Pass `existingHiddenName`/`existingValue` to keep the `existing_*` hidden
 * input inside this component (it must remain in the form to preserve
 * already-saved images when no new file is chosen).
 *
 * Upload-on-select: when `upload` is provided the file is sent to storage
 * the moment it is chosen. The resolved URL lands in the hidden
 * `existing_*` field immediately, so autosave can persist it right away —
 * the file input is then cleared, which keeps a later explicit Save from
 * re-uploading the same bytes (no duplicate media).
 *
 * Reliability notes (these were real, reproduced defects):
 *
 *  1. Resolving an upload used to write React state only. The form never saw
 *     an `input`/`change` event, so the autosave hook never scheduled a save
 *     and the `dirty` flag stayed false — meaning even the best-effort save
 *     on navigate did not run. An uploaded image could therefore be lost
 *     entirely. Every mutation here now writes the DOM value and dispatches
 *     bubbling `input` + `change` events.
 *  2. The hidden field is deliberately UNCONTROLLED and written through a
 *     ref. A controlled `value={...}` fought the autosave recovery path,
 *     which sets DOM values directly — recovery silently reverted.
 *  3. Removal is race-safe: a monotonically increasing token invalidates any
 *     upload response still in flight, so a slow upload that lands after the
 *     user deleted the image can never resurrect it.
 *  4. The hidden field's `defaultValue` is driven from committed state. React
 *     rewrites an uncontrolled input's defaultValue on commit, and for a
 *     hidden input that assignment also rewrites the live value — so a
 *     hard-coded defaultValue silently blanked the resolved URL and the next
 *     autosave wiped the image. It also doubles as the initial preview source,
 *     so a saved image is visible on open.
 *
 *  5. An upload can no longer leave the zone stuck on "Uploading…". Three
 *     separate defects made that state permanent, all reproduced:
 *       · a delete/replace during an upload bumped the race token and the
 *         completion path returned early WITHOUT clearing `uploading`, so the
 *         spinner, the disabled file input and the dead click target stayed
 *         forever;
 *       · a request that never returned (browser `fetch` has no timeout) was
 *         indistinguishable from one still in progress;
 *       · the success label "Uploaded — saving…" was never cleared, so a
 *         finished upload looked permanently unfinished.
 *     Uploads are now bounded and cancellable (see lib/upload-client.ts), the
 *     completion path always clears its own loading state, a failure reverts
 *     the preview and offers Retry, and the "saving…" label is resolved by the
 *     real autosave status event.
 */

export function ImageUploadZone({
  name,
  label,
  existingHiddenName,
  existingValue = "",
  accept = "image/jpeg,image/png,image/webp,image/gif",
  multiple = false,
  compact = false,
  initialPreview,
  previewAspect = "aspect-[16/10]",
  removable = true,
  removeConfirm = true,
  persistHint = "autosave",
  onFilesSelected,
  upload,
  onUploaded,
}: {
  /** Accepted file types shown as-is to the browser picker. */
  name: string;
  label: string;
  existingHiddenName?: string;
  existingValue?: string;
  accept?: string;
  multiple?: boolean;
  compact?: boolean;
  initialPreview?: string | null;
  previewAspect?: string;
  /** Show a Delete button on the preview. Default true. */
  removable?: boolean;
  /** Ask before deleting. Default true. */
  removeConfirm?: boolean;
  /**
   * How the resolved URL reaches the database: "autosave" (the editor saves by
   * itself) or "manual" (the form only saves on submit, e.g. archive issues).
   * Only changes the wording — the zone must never imply work is already
   * persisted when the operator still has to press Save.
   */
  persistHint?: "autosave" | "manual";
  onFilesSelected?: (files: File[]) => void;
  /**
   * Upload immediately on selection instead of at submit time. Receives an
   * AbortSignal so a running upload can be cancelled from the UI.
   */
  upload?: (file: File, signal?: AbortSignal) => Promise<UploadResult>;
  /** Called with the resolved public URLs once uploads succeed. */
  onUploaded?: (urls: string[]) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();
  // An image that is already saved must be visible the moment the editor
  // opens. `initialPreview` is the explicit override; falling back to the
  // stored hidden value means every zone that is given a saved URL (the four
  // inline article images, for instance) shows it instead of an empty box
  // until the user happens to re-upload.
  const [previews, setPreviews] = useState<string[]>(() => {
    const shown = initialPreview ?? (existingValue || null);
    return shown ? [shown] : [];
  });
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadRetryable, setUploadRetryable] = useState(false);
  /** Mirrors "lastFilesRef holds something retryable" for render. */
  const [canRetry, setCanRetry] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  // The upload itself succeeded but the autosave that persists the URL did
  // not. Never reported as a silent success.
  const [persistFailed, setPersistFailed] = useState(false);

  // Bumped on every reset/removal. A resolved upload whose token is stale is
  // discarded, so a late response cannot restore a deleted image.
  const tokenRef = useRef(0);
  /** Cancels the running transfer; also used by the Cancel button. */
  const abortRef = useRef<AbortController | null>(null);
  /**
   * The files of the last attempt, kept in memory so Retry can re-send them
   * without asking the operator to find the file again. The native input's own
   * value is cleared on failure so an un-uploaded file can never ride along in
   * the form submit (that POST was itself an oversized body — the failure this
   * fix removes).
   */
  const lastFilesRef = useRef<File[]>([]);
  /** Object URLs handed to <img src>, revoked when replaced or unmounted. */
  const blobUrlsRef = useRef<string[]>([]);

  // Mirror of the hidden field's committed value.
  //
  // This MUST track the field exactly. The hidden input is deliberately
  // uncontrolled, but React rewrites an uncontrolled input's `defaultValue`
  // on commit — and for `<input type="hidden">` assigning `defaultValue`
  // also rewrites the LIVE `.value`, because a hidden input never acquires
  // the "dirty value" flag that normally shields a typed-in value. So the URL
  // written by commitValue was silently reset back to the (empty)
  // defaultValue a tick later, and the next autosave read "" and wiped the
  // image — the reason deleting image 1 could also delete image 2. Driving
  // `defaultValue` from this state makes React's rewrite land on the correct
  // value instead of blanking it.
  const [committed, setCommitted] = useState(existingValue);

  /**
   * Write the hidden field, tell the form it changed, and ask autosave to
   * persist it *now* rather than after the typing debounce.
   *
   * The immediate flush matters: an upload is a finished action, not a
   * keystroke. If it were only debounced, a user who uploads and immediately
   * navigates away would lose it — the pending timer is cancelled by the
   * unload. `autosave:flush` is handled by useAutosave.
   */
  const commitValue = (url: string) => {
    setCommitted(url);
    const node = hiddenRef.current;
    if (!node) return;
    node.value = url;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    node.dispatchEvent(new CustomEvent("autosave:flush", { bubbles: true }));
  };

  // A saved image the user deleted must stay deleted even if a stale upload
  // result arrives afterwards — the token guard above covers that.
  const removeImage = () => {
    if (removeConfirm && !window.confirm("Remove this image?")) return;
    // Cancel first, and clear the loading state here as well as in the
    // completion path: deleting during an upload used to leave `uploading`
    // true forever (the completion path returned early on a stale token), so
    // the zone kept saying "Uploading…", the file input stayed disabled and
    // the zone stopped opening the picker.
    abortRef.current?.abort();
    abortRef.current = null;
    tokenRef.current += 1; // invalidate any in-flight upload
    setUploading(false);
    setPreviews([]);
    setUploadError(null);
    setUploadRetryable(false);
    setCanRetry(false);
    setJustUploaded(false);
    setPersistFailed(false);
    lastFilesRef.current = [];
    if (inputRef.current) inputRef.current.value = "";
    // "" is a *present-but-empty* value: the server reads that as a
    // deliberate clear and persists the removal.
    commitValue("");
  };

  /** Show a local file and remember its blob URL so it can be revoked. */
  const showLocalPreviews = (files: File[]) => {
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const urls = files.map((file) => URL.createObjectURL(file));
    blobUrlsRef.current = urls;
    setPreviews(urls);
  };

  /** Fall back to whatever the form actually holds (the committed URL). */
  const revertPreview = () => {
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
    setPreviews(committed ? [committed] : []);
  };

  /**
   * Send `list` to storage. Bounded, cancellable, and every exit path clears
   * the loading state — the zone can never be left saying "Uploading…".
   */
  const runUpload = async (list: File[]) => {
    if (!upload) return;
    lastFilesRef.current = list;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const token = ++tokenRef.current;

    setUploading(true);
    setUploadError(null);
    setUploadRetryable(false);
    setCanRetry(false);
    setPersistFailed(false);
    beginUploadActivity();

    try {
      const resolved: UploadResult[] = await Promise.all(
        list.map((file) =>
          upload(file, controller.signal).catch(() => ({
            url: null,
            error: "Upload failed. Check your connection and try again.",
            retryable: true,
          }))
        )
      );

      // The user deleted (or replaced) while this was in flight — drop it.
      // The loading flag was already cleared by whoever superseded us.
      if (token !== tokenRef.current) return;

      const urls = resolved
        .map((result) => result.url)
        .filter((url): url is string => Boolean(url));
      const failed = resolved.find((result) => result.error);
      const cancelled = resolved.length > 0 && resolved.every((r) => r.cancelled);

      if (urls.length > 0) {
        commitValue(urls[0]);
        setJustUploaded(true);
        onUploaded?.(urls);
      }

      if (failed?.error) {
        // Never leave a failed file inside the form: a later Save would post
        // the bytes inside the action body, which is the path that cannot
        // work in production. The File objects stay in memory for Retry.
        setUploadError(
          urls.length > 0
            ? `${failed.error} (${urls.length} of ${list.length} uploaded)`
            : failed.error
        );
        const retryable = failed.retryable !== false;
        setUploadRetryable(retryable);
        setCanRetry(retryable && list.length > 0);
        revertPreview();
      } else if (cancelled) {
        revertPreview();
        lastFilesRef.current = [];
        setCanRetry(false);
      }
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      endUploadActivity();
      // Only the current attempt owns the flag; a newer attempt (or a delete)
      // has already set its own value.
      if (token === tokenRef.current) {
        setUploading(false);
        abortRef.current = null;
      }
    }
  };

  /**
   * The File objects are captured here and the native input is emptied on the
   * spot, so the form body can NEVER contain a file.
   *
   * Leaving the selection attached was its own production failure: a Save
   * clicked while the upload was still running posted the bytes with the form,
   * and the host rejects any request body over 4 500 000 bytes with HTTP 413
   * (`FUNCTION_PAYLOAD_TOO_LARGE`) before the app can even see the request.
   */
  const handleFiles = (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    if (inputRef.current) inputRef.current.value = "";
    showLocalPreviews(list);
    onFilesSelected?.(list);
    void runUpload(list);
  };

  const retryUpload = () => {
    const list = lastFilesRef.current;
    if (!list.length) return;
    showLocalPreviews(list);
    onFilesSelected?.(list);
    void runUpload(list);
  };

  const cancelUpload = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploading(false);
  };

  // Autosave recovery: the hook re-dispatches the snapshot onto the form.
  // Refresh both the preview and the hidden value so a recovered image is
  // visible rather than silently reverted by React.
  useEffect(() => {
    if (!existingHiddenName) return;
    const onRestore = (event: Event) => {
      const detail = (
        event as CustomEvent<{ data?: Record<string, string[]> }>
      ).detail;
      const raw = detail?.data?.[existingHiddenName]?.[0];
      if (raw === undefined) return;
      const node = hiddenRef.current;
      if (node) node.value = raw;
      setCommitted(raw);
      setPreviews(raw ? [raw] : []);
    };
    window.addEventListener("autosave:restore", onRestore);
    return () => window.removeEventListener("autosave:restore", onRestore);
  }, [existingHiddenName]);

  /**
   * Resolve the "Uploaded — saving…" label against the real autosave result.
   *
   * The label was previously never cleared, so a finished upload looked like an
   * operation that had hung, and a FAILED autosave still displayed the calm
   * "saving…" wording. useAutosave broadcasts its status; the zone reacts:
   * saved ⇒ stop claiming work is pending, error ⇒ say plainly that the
   * upload is not persisted yet.
   */
  useEffect(() => {
    const onStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: string }>).detail;
      if (detail?.status === "saved") {
        setJustUploaded(false);
        setPersistFailed(false);
      } else if (detail?.status === "error") {
        setPersistFailed(true);
      }
    };
    window.addEventListener("autosave:status", onStatus);
    // A manual Save persists the URL too — stop claiming it is pending.
    const form = hiddenRef.current?.form ?? null;
    const onSubmit = () => setJustUploaded(false);
    form?.addEventListener("submit", onSubmit);
    return () => {
      window.removeEventListener("autosave:status", onStatus);
      form?.removeEventListener("submit", onSubmit);
    };
  }, []);

  // Leaving the page must not leave a transfer running or a blob URL alive.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    },
    []
  );

  const showDelete = removable && previews.length > 0;

  return (
    // `data-image-slot` names the field this zone owns, so a test (or any
    // tooling) can address one specific slot rather than guessing by DOM
    // order across the cover and the four inline images.
    <div data-image-slot={name}>
      {existingHiddenName ? (
        <input
          ref={hiddenRef}
          type="hidden"
          name={existingHiddenName}
          // Must equal the committed value: React rewrites an uncontrolled
          // input's defaultValue on commit, and for a hidden input that also
          // rewrites the live value (see `committed` above).
          defaultValue={committed}
        />
      ) : null}

      <AnimatePresence mode="popLayout" initial={false}>
        {previews.length > 0 ? (
          <motion.div
            key="previews"
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 300, damping: 26 }
            }
            className="mb-2"
          >
            <div
              className={`relative overflow-hidden border border-hairline bg-white ${previewAspect} ${
                compact ? "max-w-[200px]" : "max-w-sm"
              } w-full`}
              style={{ borderRadius: 2 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previews[0]}
                alt={label}
                className="h-full w-full object-contain"
              />
              {uploading ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70">
                  <Loader2 size={18} strokeWidth={2} className="animate-spin text-digest-red" />
                  <button
                    type="button"
                    onClick={cancelUpload}
                    className="border border-hairline bg-white px-2 py-1 font-admin text-[10px] font-semibold uppercase tracking-[0.08em] text-ink hover:border-digest-red hover:text-digest-red"
                    style={{ borderRadius: 2 }}
                  >
                    Cancel
                  </button>
                </span>
              ) : null}
            </div>

            {showDelete ? (
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  type="button"
                  data-testid="image-remove"
                  onClick={removeImage}
                  // Touch reliability (real, reproduced on a 390–412px phone
                  // viewport): the painted control is only 27px tall and is
                  // boxed in by the preview image 6px above it and the upload
                  // zone a few px below, so a finger landing just off-centre
                  // hit inert pixels and "Delete image" did nothing — while a
                  // tap a little lower opened the file picker instead.
                  //  · `relative` + the invisible ::before grow the HIT area to
                  //    ~45x148px (the 44px platform minimum) without moving or
                  //    resizing the painted button, so desktop looks identical.
                  //  · it only covers pixels that have no handler (the gap,
                  //    the inert preview image, the row's spare width); the
                  //    upload zone paints above it, so it can never steal a tap
                  //    meant for "Replace cover image".
                  //  · `touch-manipulation` stops the browser treating the tap
                  //    as a double-tap-zoom/pan gesture, and `select-none`
                  //    stops a long press becoming a text selection that
                  //    swallows the click — the two other ways a touch tap on
                  //    this button never produced a click.
                  className="relative inline-flex items-center gap-1.5 border border-digest-red/40 px-2.5 py-1 font-admin text-[11px] font-semibold uppercase tracking-[0.08em] text-digest-red transition-colors hover:bg-digest-red hover:text-paper select-none touch-manipulation before:absolute before:-top-3.5 before:-bottom-1 before:-left-3 before:-right-3 before:content-['']"
                  style={{ borderRadius: 2 }}
                >
                  <Trash2 size={12} strokeWidth={2.5} />
                  Delete image
                </button>
                {justUploaded ? (
                  persistFailed ? (
                    <span role="status" className="font-admin text-[11px] font-medium text-digest-red">
                      Uploaded — not saved yet
                    </span>
                  ) : (
                    <span role="status" className="font-admin text-[11px] text-stone">
                      {persistHint === "manual"
                        ? "Uploaded — remember to save"
                        : "Uploaded — saving…"}
                    </span>
                  )
                ) : null}
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        className={`relative flex cursor-pointer flex-col items-center justify-center border border-dashed bg-white/60 text-center transition-colors ${
          compact ? "gap-1 px-4 py-4" : "gap-2 px-6 py-8"
        }`}
        style={{
          borderRadius: 2,
          borderColor: dragActive ? "var(--color-digest-red)" : "var(--color-hairline)",
          backgroundColor: dragActive ? "rgba(165,28,48,0.04)" : undefined,
        }}
        whileHover={reduce ? undefined : { borderColor: "rgba(165,28,48,0.55)" }}
        animate={
          reduce
            ? undefined
            : {
                boxShadow: dragActive
                  ? "0 0 0 3px rgba(165,28,48,0.12)"
                  : "0 0 0 0 rgba(165,28,48,0)",
              }
        }
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (inputRef.current) {
            inputRef.current.files = e.dataTransfer.files;
          }
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => (uploading ? undefined : inputRef.current?.click())}
      >
        <motion.span
          animate={
            reduce
              ? undefined
              : dragActive
                ? { scale: 1.15, y: -2 }
                : { scale: 1, y: 0 }
          }
          transition={
            reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 20 }
          }
          className="text-digest-red"
        >
          {uploading ? (
            <Loader2
              size={compact ? 18 : 24}
              strokeWidth={1.75}
              className="animate-spin"
            />
          ) : (
            <ImagePlus size={compact ? 18 : 24} strokeWidth={1.75} />
          )}
        </motion.span>
        <span
          className={`font-admin font-medium text-ink ${compact ? "text-xs" : "text-sm"}`}
        >
          {uploading ? "Uploading…" : label}
        </span>
        <span className="font-admin text-[11px] text-stone">
          Drag &amp; drop or click · JPEG, PNG, WEBP, GIF up to {" "}
          {IMAGE_MAX_LABEL}
        </span>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />
      </motion.div>
      {uploadError ? (
        <p
          role="alert"
          className="mt-1.5 flex flex-wrap items-center gap-2 font-admin text-xs font-medium text-digest-red"
        >
          {uploadError}
          {uploadRetryable && canRetry ? (
            <button
              type="button"
              data-testid="image-retry"
              onClick={retryUpload}
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

/** Small circular remove button used on gallery thumbs. */
export function RemoveThumbButton({
  onRemove,
  label,
}: {
  onRemove: () => void;
  label: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onRemove}
      whileHover={reduce ? undefined : { scale: 1.12 }}
      whileTap={reduce ? undefined : { scale: 0.9 }}
      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center bg-digest-red text-paper"
      style={{ borderRadius: 2 }}
    >
      <X size={13} strokeWidth={2.5} />
    </motion.button>
  );
}
