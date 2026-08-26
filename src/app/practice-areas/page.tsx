import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getPracticeAreas } from "@/lib/supabase/queries/practice-areas";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { LegalScales } from "@/components/ui/editorial-illustration";

export const metadata: Metadata = {
  title: "Practice Areas — Law Digest",
  description: "Law Digest coverage areas.",
};

export default async function PracticeAreasPage() {
  const supabase = createSupabaseServerClient();
  const practiceAreas = await getPracticeAreas(supabase);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Reveal>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Practice Areas" title="Coverage areas" />
          <LegalScales className="h-20 w-20 shrink-0 opacity-20" />
        </div>
        <ul className="grid gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-2 md:grid-cols-3">
          {practiceAreas.map((area) => (
            <li key={area.slug} className="bg-paper">
              <Link
                href={`/practice-areas/${area.slug}`}
                className="block px-5 py-4 font-admin text-sm text-ink transition-colors duration-300 hover:bg-ink hover:text-paper"
              >
                {area.name}
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}
