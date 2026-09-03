"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteIssueAction } from "@/app/admin/(protected)/issues/actions";

export function DeleteIssueButton({
  id,
  issueNumber,
  articleCount,
  isCurrentIssue,
}: {
  id: string;
  issueNumber: number;
  articleCount: number;
  isCurrentIssue: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        const warnings = [
          articleCount > 0
            ? `${articleCount} article${articleCount === 1 ? "" : "s"} currently reference${
                articleCount === 1 ? "s" : ""
              } this issue and will lose that association (they won't be deleted).`
            : null,
          isCurrentIssue
            ? "This is the highest-numbered issue, so it's what the homepage and Issues pages currently show as the latest issue — deleting it will leave those sections empty until another issue exists."
            : null,
        ].filter(Boolean);

        const message = [`Delete Issue ${issueNumber}?`, ...warnings, "This can't be undone."].join(
          "\n\n"
        );

        if (!window.confirm(message)) return;

        startTransition(async () => {
          const result = await deleteIssueAction(id);
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
