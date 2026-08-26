import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getInThisIssue } from "@/lib/supabase/queries/articles";
import { PageNumberBadge } from "@/components/ui/page-number-badge";
import { Byline } from "@/components/ui/byline";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

export async function InThisIssue() {
  const supabase = createSupabaseServerClient();
  const inThisIssue = await getInThisIssue(supabase);

  if (inThisIssue.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <Reveal>
        <SectionHeading eyebrow="In This Issue" title="On the cover this issue" />
        <ul className="divide-y divide-hairline border-y border-hairline">
          {inThisIssue.map((item, index) => (
            <Reveal key={item.slug} delay={index * 0.06}>
              <li className="flex items-center gap-4 py-5 transition-colors duration-300 hover:bg-digest-red/[0.03]">
                <PageNumberBadge page={item.page} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/articles/${item.slug}`}
                    className="block font-display text-lg italic text-ink transition-colors duration-300 hover:text-digest-red"
                  >
                    {item.title}
                  </Link>
                  <Byline author={item.author} />
                </div>
                <span className="hidden shrink-0 font-utility text-[10px] uppercase tracking-wide text-stone transition-colors duration-300 group-hover:text-digest-red sm:inline">
                  →
                </span>
              </li>
            </Reveal>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
