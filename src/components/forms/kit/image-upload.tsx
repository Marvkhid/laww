"use client";

import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { ImagePlus, X } from "lucide-react";
import { useId, useRef, useState } from "react";

/**
 * Premium image upload zone.
 *
 * Renders a visually-hidden native file input with the given `name`, so the
 * form's server action receives the exact same FormData fields as before.
 * Pass `existingHiddenName`/`existingValue` to keep the `existing_*` hidden
 * input inside this component (it must remain in the form to preserve
 * already-saved images when no new file is chosen).
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
  onFilesSelected,
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
  onFilesSelected?: (files: File[]) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();
  const [previews, setPreviews] = useState<string[]>(initialPreview ? [initialPreview] : []);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setPreviews(list.map((f) => URL.createObjectURL(f)));
    onFilesSelected?.(list);
  };

  return (
    <div>
      {existingHiddenName ? (
        <input type="hidden" name={existingHiddenName} value={existingValue} />
      ) : null}

      <AnimatePresence mode="popLayout" initial={false}>
        {previews.length > 0 ? (
          <motion.div
            key="previews"
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 26 }}
            className={`mb-3 overflow-hidden border border-hairline bg-white ${previewAspect} ${compact ? "max-w-[200px]" : "max-w-sm"} w-full`}
            style={{ borderRadius: 2 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previews[0]}
              alt={label}
              className="h-full w-full object-contain"
            />
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
            : { boxShadow: dragActive ? "0 0 0 3px rgba(165,28,48,0.12)" : "0 0 0 0 rgba(165,28,48,0)" }
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
        onClick={() => inputRef.current?.click()}
      >
        <motion.span
          animate={reduce ? undefined : dragActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 20 }}
          className="text-digest-red"
        >
          <ImagePlus size={compact ? 18 : 24} strokeWidth={1.75} />
        </motion.span>
        <span className={`font-admin font-medium text-ink ${compact ? "text-xs" : "text-sm"}`}>
          {label}
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
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />
      </motion.div>
    </div>
  );
}

/** Small circular remove button used on gallery thumbs. */
export function RemoveThumbButton({ onRemove, label }: { onRemove: () => void; label: string }) {
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
