"use client";

import { useState, useTransition } from "react";
import { clearNewsletterSubscribers } from "./clear-subscribers-action";

export function ClearSubscribersButton() {
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-6 border border-hairline bg-paper-warm px-5 py-4">
      <p className="text-sm font-semibold text-ink">Newsletter subscribers</p>
      <p className="mt-1 text-xs text-[#5f5a54]">
        Permanently deletes every newsletter subscriber. This cannot be undone.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Delete ALL newsletter subscribers? This cannot be undone.")) return;
          startTransition(async () => {
            const msg = await clearNewsletterSubscribers();
            setResult(msg);
          });
        }}
        className="mt-3 bg-digest-red px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-digest-red-deep disabled:opacity-60"
      >
        {isPending ? "Clearing…" : "Clear Subscribers"}
      </button>
      {result && (
        <p className="mt-2 text-xs font-semibold text-ink" role="status">
          {result}
        </p>
      )}
    </div>
  );
}
