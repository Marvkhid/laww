import type { Metadata } from "next";
import Link from "next/link";
import { listSponsorsForAdmin } from "@/lib/supabase/admin/sponsors";
import { DeleteSponsorButton } from "@/app/admin/(protected)/sponsors/delete-button";
import { ToggleSponsorActiveButton } from "@/app/admin/(protected)/sponsors/toggle-active-button";

export const metadata: Metadata = {
  title: "Sponsors — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminSponsorsPage() {
  const sponsors = await listSponsorsForAdmin();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-admin text-2xl font-semibold text-ink">Sponsors</h1>
        <Link
          href="/admin/sponsors/new"
          className="bg-digest-red px-4 py-2 font-admin text-sm font-semibold uppercase tracking-wide text-paper"
        >
          New
        </Link>
      </div>

      {sponsors.length === 0 ? (
        <p className="mt-6 font-admin text-sm text-[#333]">No sponsors yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
          {sponsors.map((sponsor) => (
            <li key={sponsor.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-admin text-sm text-ink">{sponsor.name}</p>
                <p className="font-admin text-[11px] font-semibold uppercase tracking-wide text-ink">
                  {sponsor.tier ? `${sponsor.tier} · ` : ""}{sponsor.placement ?? "all"} · Order {sponsor.display_order}{typeof sponsor.page_number === "number" ? ` · p. ${sponsor.page_number}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <ToggleSponsorActiveButton id={sponsor.id} active={sponsor.active} />
                <Link
                  href={`/admin/sponsors/${sponsor.id}/edit`}
                  className="font-admin text-xs font-semibold uppercase tracking-wide text-digest-red hover:text-digest-red-deep"
                >
                  Edit
                </Link>
                <DeleteSponsorButton id={sponsor.id} name={sponsor.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
