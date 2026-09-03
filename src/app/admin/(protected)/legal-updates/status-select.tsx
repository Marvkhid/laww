"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLegalUpdateStatusAction } from "@/app/admin/(protected)/legal-updates/actions";
import type { LegalUpdateStatus } from "@/lib/supabase/types";

export function LegalUpdateStatusSelect({
  id,
  status,
}: {
  id: string;
  status: LegalUpdateStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(event) => {
        const next = event.target.value as LegalUpdateStatus;
        startTransition(async () => {
          const result = await setLegalUpdateStatusAction(id, next);
          if (result?.error) {
            window.alert(result.error);
            return;
          }
          router.refresh();
        });
      }}
      className="border border-hairline bg-white px-2 py-1.5 font-admin text-xs font-semibold uppercase tracking-wide text-ink disabled:opacity-60"
    >
      <option value="pending_review">Pending review</option>
      <option value="published">Published</option>
      <option value="rejected">Rejected</option>
    </select>
  );
}
