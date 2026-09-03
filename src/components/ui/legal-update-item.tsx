import Link from "next/link";
import type { LegalUpdate } from "@/lib/types";

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function LegalUpdateItem({ update }: { update: LegalUpdate }) {
  return (
    <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-4">
      <Link
        href={`/legal-updates/${update.slug}`}
        className="font-body text-sm text-ink transition-colors duration-300 hover:text-digest-red sm:flex-1"
      >
        {update.headline}
      </Link>
      <time
        dateTime={update.publishedAt}
        className="font-utility text-[10px] uppercase tracking-wide text-stone"
      >
        {update.sourceName} · {relativeTime(update.publishedAt)}
        {update.practiceArea ? ` · § ${update.practiceArea}` : ""}
      </time>
    </li>
  );
}
