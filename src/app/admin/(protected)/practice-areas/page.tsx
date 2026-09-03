import type { Metadata } from "next";
import Link from "next/link";
import { listPracticeAreasForAdmin } from "@/lib/supabase/admin/practice-areas";
import { DeletePracticeAreaButton } from "@/app/admin/(protected)/practice-areas/delete-button";

export const metadata: Metadata = {
  title: "Practice Areas — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPracticeAreasPage() {
  const practiceAreas = await listPracticeAreasForAdmin();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-admin text-2xl font-semibold text-ink">Practice Areas</h1>
        <Link
          href="/admin/practice-areas/new"
          className="bg-digest-red px-4 py-2 font-admin text-sm font-semibold uppercase tracking-wide text-paper"
        >
          New
        </Link>
      </div>

      {practiceAreas.length === 0 ? (
        <p className="mt-6 font-admin text-sm text-[#333]">No practice areas yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
          {practiceAreas.map((area) => (
            <li key={area.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-admin text-sm text-ink">{area.name}</p>
                <p className="font-admin text-[11px] font-semibold uppercase tracking-wide text-ink">
                  /{area.slug}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/practice-areas/${area.id}/edit`}
                  className="font-admin text-xs font-semibold uppercase tracking-wide text-digest-red hover:text-digest-red-deep"
                >
                  Edit
                </Link>
                <DeletePracticeAreaButton id={area.id} slug={area.slug} name={area.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
