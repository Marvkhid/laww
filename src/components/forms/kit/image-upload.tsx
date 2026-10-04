"use client";

import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

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
 */

type UploadResult = { url: string | null; error: string | null };

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
  onFilesSelected,
  upload,
  onUploaded,
}: {
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
  onFilesSelected?: (files: File[]) => void;
  /** Upload immediately on selection instead of at submit time. */
  upload?: (file: File) => Promise<UploadResult>;
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
  const [justUploaded, setJustUploaded] = useState(false);

  // Bumped on every reset/removal. A resolved upload whose token is stale is
  // discarded, so a late response cannot restore a deleted image.
  const tokenRef = useRef(0);

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
    tokenRef.current += 1; // invalidate any in-flight upload
    setPreviews([]);
    setUploadError(null);
    setJustUploaded(false);
    if (inputRef.current) inputRef.current.value = "";
    // "" is a *present-but-empty* value: the server reads that as a
    // deliberate clear and persists the removal.
    commitValue("");
  };

  const runUpload = (list: File[]) => {
    if (!upload) return;
    const token = tokenRef.current;
    setUploading(true);
    setUploadError(null);
    const results = Promise.all(
      list.map((file) =>
        upload(file).catch(() => ({
          url: null,
          error: "Upload failed. Check your connection and try again.",
        }))
      )
    );
    void results
      .then((resolved) => {
        // The user deleted (or replaced) while this was in flight — drop it.
        if (token !== tokenRef.current) return;
        setUploading(false);
        const urls = resolved
          .map((result) => result.url)
          .filter((url): url is string => Boolean(url));
        const firstError = resolved.find((result) => result.error);
        if (urls.length > 0) {
          commitValue(urls[0]);
          setJustUploaded(true);
          onUploaded?.(urls);
        }
        if (firstError?.error) {
          setUploadError(
            urls.length > 0
              ? `${firstError.error} (${urls.length} of ${list.length} uploaded)`
              : firstError.error
          );
        } else if (inputRef.current) {
          // The URL is stored, so a later Save must not re-upload the bytes.
          inputRef.current.value = "";
        }
      })
      .catch(() => {
        if (token !== tokenRef.current) return;
        setUploading(false);
        setUploadError("Upload failed. Check your connection and try again.");
      });
  };

  const handleFiles = (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setPreviews(list.map((f) => URL.createObjectURL(f)));
    setJustUploaded(true);
    onFilesSelected?.(list);
    runUpload(list);
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
                <span className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <Loader2 size={18} strokeWidth={2} className="animate-spin text-digest-red" />
                </span>
              ) : null}
            </div>

            {showDelete ? (
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  type="button"
                  data-testid="image-remove"
                  onClick={removeImage}
                  className="inline-flex items-center gap-1.5 border border-digest-red/40 px-2.5 py-1 font-admin text-[11px] font-semibold uppercase tracking-[0.08em] text-digest-red transition-colors hover:bg-digest-red hover:text-paper"
                  style={{ borderRadius: 2 }}
                >
                  <Trash2 size={12} strokeWidth={2.5} />
                  Delete image
                </button>
                {justUploaded ? (
                  <span className="font-admin text-[11px] text-stone">
                    Uploaded — saving…
                  </span>
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
          Drag &amp; drop or click · JPEG, PNG, WEBP, GIF up to 5MB
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
          className="mt-1.5 font-admin text-xs font-medium text-digest-red"
        >
          {uploadError}
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
