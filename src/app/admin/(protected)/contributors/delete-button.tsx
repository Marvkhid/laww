"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteContributorAction } from "@/app/admin/(protected)/contributors/actions";

export function DeleteContributorButton({
  id,
  slug,
  name,
}: {
  id: string;
  slug: string;
  name: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
        startTransition(async () => {
          const result = await deleteContributorAction(id, slug);
          if (result?.error) {
            window.alert(result.error);
            return;
          }
          router.refresh();
        });
      }}
      className="font-admin text-xs font-medium uppercase tracking-wide text-digest-red hover:text-digest-red-deep disabled:opacity-60"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
