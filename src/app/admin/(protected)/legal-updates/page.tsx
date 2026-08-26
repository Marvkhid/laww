import type { Metadata } from "next";
import Link from "next/link";
import { listLegalUpdatesForAdmin } from "@/lib/supabase/admin/legal-updates";
import { DeleteLegalUpdateButton } from "@/app/admin/(protected)/legal-updates/delete-button";
import { LegalUpdateStatusSelect } from "@/app/admin/(protected)/legal-updates/status-select";

export const metadata: Metadata = {
  title: "Breaking Legal Updates — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLegalUpdatesPage() {
  const updates = await listLegalUpdatesForAdmin();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-admin text-2xl font-semibold text-ink">Breaking Legal Updates</h1>
        <Link
          href="/admin/legal-updates/new"
          className="bg-digest-red px-4 py-2 font-admin text-sm uppercase tracking-wide text-paper"
        >
          New
        </Link>
      </div>

      {updates.length === 0 ? (
        <p className="mt-6 font-admin text-sm text-[#333]">No legal updates yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
          {updates.map((update) => (
            <li key={update.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-admin text-sm text-ink">{update.headline}</p>
                <p className="font-admin text-[10px] font-medium uppercase tracking-wide text-ink">
                  {update.source_name}
                  {update.practice_area_name ? ` · ${update.practice_area_name}` : ""}
                  {update.origin === "auto_rss" ? " · RSS" : " · Manual"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <LegalUpdateStatusSelect id={update.id} status={update.status} />
                <Link
                  href={`/admin/legal-updates/${update.id}/edit`}
                  className="font-admin text-xs font-medium uppercase tracking-wide text-digest-red hover:text-digest-red-deep"
                >
                  Edit
                </Link>
                <DeleteLegalUpdateButton id={update.id} headline={update.headline} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
