"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteArticleAction } from "@/app/admin/(protected)/articles/actions";

export function DeleteArticleButton({ id, slug, title }: { id: string; slug: string; title: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
        startTransition(async () => {
          const result = await deleteArticleAction(id, slug);
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
