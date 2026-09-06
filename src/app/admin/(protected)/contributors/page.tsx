import type { Metadata } from "next";
import Link from "next/link";
import { listContributorsForAdmin } from "@/lib/supabase/admin/contributors";
import { DeleteContributorButton } from "@/app/admin/(protected)/contributors/delete-button";

export const metadata: Metadata = {
  title: "Editorial Board — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminContributorsPage() {
  const contributors = await listContributorsForAdmin();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-admin text-2xl font-semibold text-ink">Editorial Board</h1>
        <Link
          href="/admin/contributors/new"
          className="bg-digest-red px-4 py-2 font-admin text-sm font-semibold uppercase tracking-wide text-paper"
        >
          New
        </Link>
      </div>

      {contributors.length === 0 ? (
        <p className="mt-6 font-admin text-sm text-[#333]">No members yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
          {contributors.map((person) => (
            <li key={person.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-admin text-sm text-ink">
                  {person.name}
                  {person.credentials ? `, ${person.credentials}` : ""}
                </p>
                <p className="font-admin text-[11px] font-semibold uppercase tracking-wide text-ink">
                  /{person.slug} · {person.role}
                  {person.is_editorial_board ? " · Editorial Board" : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/contributors/${person.id}/edit`}
                  className="font-admin text-xs font-semibold uppercase tracking-wide text-digest-red hover:text-digest-red-deep"
                >
                  Edit
                </Link>
                <DeleteContributorButton id={person.id} slug={person.slug} name={person.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
