import Image from "next/image";
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
              <li key={area.slug} className="group relative">
                <Link
                  href={`/practice-areas/${area.slug}`}
                  className="block bg-paper transition-colors duration-300 hover:bg-ink hover:text-paper"
                >
                  {area.imageUrl ? (
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-hairline/20">
                      {/* object-contain: the uploaded image is never cropped */}
                      <Image
                        src={area.imageUrl}
                        alt={area.imageAlt ?? area.name}
                        fill
                        sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-contain"
                      />
                    </div>
                  ) : null}
                  <div className="px-5 py-5">
                    <span className="block font-admin text-[14px] font-semibold uppercase">
                      {area.name}
                    </span>
                    {area.description ? (
                      <span className="mt-2 block font-body text-[13px] font-normal leading-relaxed normal-case text-stone transition-colors duration-300 group-hover:text-paper/75">
                        {area.description}
                      </span>
                    ) : null}
                  </div>
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
