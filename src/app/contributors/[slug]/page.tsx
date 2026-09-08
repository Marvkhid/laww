import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getContributorBySlug, getContributors } from "@/lib/supabase/queries/contributors";
import { getArticlesByContributorSlug } from "@/lib/supabase/queries/articles";
import { PageNumberBadge } from "@/components/ui/page-number-badge";
import { ContributorAvatar } from "@/components/ui/contributor-avatar";
import { Reveal } from "@/components/motion/reveal";

export async function generateStaticParams() {
  try {
    const supabase = createSupabaseServerClient();
    const contributors = await getContributors(supabase);
    return contributors.map((person) => ({ slug: person.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  const person = await getContributorBySlug(supabase, slug);
  if (!person) return {};
  return { title: `${person.name} — Law Digest`, description: person.role };
}

export default async function ContributorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  const [person, byThisContributor] = await Promise.all([
    getContributorBySlug(supabase, slug),
    getArticlesByContributorSlug(supabase, slug),
  ]);

  if (!person) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Reveal>
        <ContributorAvatar
          name={person.name}
          photoUrl={person.photoUrl}
          size="lg"
        />
        <h1 className="mt-4 font-display text-3xl italic text-ink">{person.name}</h1>
        <p className="mt-1 font-admin text-sm text-stone">{person.role}</p>

        <div className="mt-8 border-t border-hairline pt-6 font-body text-sm text-stone">
          {person.bio ? (
            <p className="whitespace-pre-line">{person.bio}</p>
          ) : (
            <p>
              A full biography has not been added yet — this profile currently shows
              only the confirmed name and role from Issue 39.
            </p>
          )}
        </div>

        {byThisContributor.length > 0 ? (
          <div className="mt-8">
            <h2 className="font-utility text-xs uppercase tracking-wide text-stone">
              Articles in this issue
            </h2>
            <ul className="mt-3 space-y-3">
              {byThisContributor.map((article) => (
                <li key={article.slug} className="flex items-center gap-3">
                  <PageNumberBadge page={article.page} />
                  <span className="font-display text-base italic text-ink">
                    {article.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Reveal>
    </div>
  );
}
