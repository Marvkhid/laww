"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSponsorActiveAction } from "@/app/admin/(protected)/sponsors/actions";

export function ToggleSponsorActiveButton({ id, active }: { id: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await toggleSponsorActiveAction(id, !active);
          if (result?.error) {
            window.alert(result.error);
            return;
          }
          router.refresh();
        });
      }}
      className={`font-admin text-xs uppercase tracking-wide disabled:opacity-60 ${
        active ? "text-digest-red hover:text-digest-red-deep" : "text-[#333] hover:text-ink"
      }`}
    >
      {isPending ? "Updating…" : active ? "Active" : "Inactive"}
    </button>
  );
}
