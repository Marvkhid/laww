"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleArticleStatusAction } from "@/app/admin/(protected)/articles/actions";

export function StatusToggleButton({
  id,
  status,
}: {
  id: string;
  status: "draft" | "published";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const nextStatus = status === "published" ? "draft" : "published";

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await toggleArticleStatusAction(id, nextStatus);
          if (result?.error) {
            window.alert(result.error);
            return;
          }
          router.refresh();
        });
      }}
      className="font-admin text-xs font-semibold uppercase tracking-wide text-digest-red hover:text-digest-red-deep disabled:opacity-60"
    >
      {isPending ? "Updating…" : status === "published" ? "Unpublish" : "Publish"}
    </button>
  );
}
