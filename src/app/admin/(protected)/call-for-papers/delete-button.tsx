"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCallForPapersAction } from "@/app/admin/(protected)/call-for-papers/actions";

export function DeleteCallForPapersButton({
  id,
  issueNumber,
}: {
  id: string;
  issueNumber: number;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Delete the call for papers for Issue ${issueNumber}? This can't be undone.`))
          return;
        startTransition(async () => {
          const result = await deleteCallForPapersAction(id);
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
