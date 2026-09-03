"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLegalUpdateAction } from "@/app/admin/(protected)/legal-updates/actions";

export function DeleteLegalUpdateButton({ id, headline }: { id: string; headline: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Delete "${headline}"? This can't be undone.`)) return;
        startTransition(async () => {
          const result = await deleteLegalUpdateAction(id);
          if (result?.error) {
            window.alert(result.error);
            return;
          }
          router.refresh();
        });
      }}
      className="font-admin text-xs font-semibold uppercase tracking-wide text-digest-red hover:text-digest-red-deep disabled:opacity-60"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
