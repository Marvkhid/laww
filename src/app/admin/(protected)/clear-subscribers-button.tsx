"use client";

import { useState, useTransition } from "react";
import { clearNewsletterSubscribers } from "./clear-subscribers-action";

export function ClearSubscribersButton() {
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-6 border border-hairline bg-paper-warm px-5 py-4 transition-colors hover:bg-ink">
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
        className="font-admin text-sm font-semibold text-ink transition-colors hover:text-paper disabled:opacity-60"
      >
        {isPending ? "Clearing…" : "Clear Subscribers"}
      </button>
      {result && (
        <p className="mt-2 font-admin text-xs text-stone">{result}</p>
      )}
    </div>
  );
}
