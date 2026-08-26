import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getContributors, getEditorialBoard } from "@/lib/supabase/queries/contributors";
import { SectionHeading } from "@/components/ui/section-heading";
import { ContributorAvatar } from "@/components/ui/contributor-avatar";
import { Reveal } from "@/components/motion/reveal";
import { Gavel } from "@/components/ui/editorial-illustration";

export const metadata: Metadata = {
  title: "Contributors — Law Digest",
  description: "Law Digest contributors and editorial board.",
};

export default async function ContributorsPage() {
  const supabase = createSupabaseServerClient();
  const [contributors, editorialBoard] = await Promise.all([
    getContributors(supabase),
    getEditorialBoard(supabase),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Reveal>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Contributors" title="This issue's contributors" />
          <Gavel className="h-16 w-16 shrink-0 opacity-20" />
        </div>
        <ul className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {contributors.map((person) => (
            <li key={person.slug} className="group">
              <Link href={`/contributors/${person.slug}`} className="flex items-center gap-3">
                <ContributorAvatar
                  name={person.name}
                  photoUrl={person.photoUrl}
                  size="md"
                  className="transition-transform duration-300 group-hover:scale-110"
                />
                <div>
                  <p className="font-admin text-sm text-ink group-hover:text-digest-red">
                    {person.name}
                  </p>
                  <p className="font-utility text-[10px] uppercase tracking-wide text-stone">
                    {person.role}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-16 font-utility text-xs uppercase tracking-wide text-stone">
          Editorial Board
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {editorialBoard.map((member) => (
            <li key={member.name} className="border-t border-hairline py-3 font-admin text-sm">
              <p className="text-ink">
                {member.name}
                {member.credentials ? `, ${member.credentials}` : ""}
              </p>
              <p className="mt-0.5 font-body text-xs text-stone">{member.role}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}
