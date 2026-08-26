import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getPracticeAreas } from "@/lib/supabase/queries/practice-areas";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { LegalScales } from "@/components/ui/editorial-illustration";

export async function PracticeAreas() {
  const supabase = createSupabaseServerClient();
  const practiceAreas = await getPracticeAreas(supabase);

  if (practiceAreas.length === 0) return null;

  return (
    <section className="border-t border-hairline bg-hairline/30">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Practice Areas" title="Coverage areas" />
            <LegalScales className="h-20 w-20 shrink-0 opacity-25" />
          </div>
          <ul className="grid gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-2 md:grid-cols-3">
            {practiceAreas.map((area) => (
              <li
                key={area.slug}
                className="group relative"
              >
                <Link
                  href={`/practice-areas/${area.slug}`}
                  className="practice-area-item block bg-paper px-5 py-5 font-admin text-[14px] font-semibold uppercase transition-all duration-300 hover:bg-ink hover:text-paper"
                >
                  <span className="relative z-10">{area.name}</span>
                </Link>
                <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-purple transition-all duration-500 group-hover:w-full" />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
