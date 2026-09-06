import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getContributors } from "@/lib/supabase/queries/contributors";
import { SectionHeading } from "@/components/ui/section-heading";
import { ContributorAvatar } from "@/components/ui/contributor-avatar";
import { Reveal } from "@/components/motion/reveal";
import { StaggerReveal, StaggerItem } from "@/components/motion/stagger-reveal";

export async function Contributors() {
  const supabase = createSupabaseServerClient();
  const contributors = await getContributors(supabase);

  if (contributors.length === 0) return null;

  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <SectionHeading eyebrow="Editorial Board" title="Who wrote this issue" />
          <StaggerReveal className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {contributors.map((person) => (
              <StaggerItem key={person.slug} className="group flex items-center gap-3">
                <ContributorAvatar
                  name={person.name}
                  photoUrl={person.photoUrl}
                  size="md"
                  className="transition-all duration-300 group-hover:scale-110"
                />
                <div className="min-w-0">
                  <p className="truncate font-admin text-sm text-ink transition-colors duration-300 group-hover:text-digest-red">
                    {person.name}
                  </p>
                  <p className="truncate font-utility text-[10px] uppercase tracking-wide text-stone">
                    {person.role}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerReveal>
        </Reveal>
      </div>
    </section>
  );
}
