"use client";

/**
 * Client-side delete button with confirmation dialog.
 * Used in Server Component pages where onClick handlers cannot be passed directly.
 */
export function DeleteConfirmButton({
  label,
  confirmMessage,
}: {
  label: string;
  confirmMessage: string;
}) {
  return (
    <button
      type="submit"
      className="font-admin text-xs font-semibold uppercase tracking-wide text-digest-red hover:text-digest-red-deep transition-opacity"
      onClick={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
