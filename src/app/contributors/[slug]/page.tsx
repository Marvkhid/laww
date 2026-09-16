import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import {
  getContributorBySlug,
  getContributors,
  getEditorialBoardMemberBySlug,
} from "@/lib/supabase/queries/contributors";
import { getArticlesByContributorSlug } from "@/lib/supabase/queries/articles";
import { SITE_URL } from "@/lib/constants";
import { PageNumberBadge } from "@/components/ui/page-number-badge";
import { ContributorAvatar } from "@/components/ui/contributor-avatar";
import { Reveal } from "@/components/motion/reveal";

export async function generateStaticParams() {
  try {
    const supabase = createSupabaseServerClient();
    const [contributors, board] = await Promise.all([
      getContributors(supabase),
      import("@/lib/supabase/queries/contributors").then((m) =>
        m.getEditorialBoard(supabase)
      ),
    ]);
    return [...contributors, ...board]
      .filter((person) => Boolean(person.slug))
      .map((person) => ({ slug: person.slug as string }));
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
  const person =
    (await getContributorBySlug(supabase, slug)) ??
    (await getEditorialBoardMemberBySlug(supabase, slug));
  if (!person) return {};
  const description =
    person.bio?.slice(0, 160) ??
    `${person.name} — ${person.role} at NG Law Digest.`;
  const canonicalUrl = `${SITE_URL}/contributors/${person.slug}`;

  return {
    title: person.name,
    description,
    alternates: { canonical: `/contributors/${person.slug}` },
    openGraph: {
      type: "profile",
      title: person.name,
      description,
      url: canonicalUrl,
      siteName: "NG Law Digest",
    },
  };
}

export default async function ContributorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();

  // One lookup covers both record types — a contributor (author) and an
  // editorial-board member share the same table and slug space.
  const [person, byThisContributor] = await Promise.all([
    getContributorBySlug(supabase, slug).then(
      (found) => found ?? getEditorialBoardMemberBySlug(supabase, slug)
    ),
    getArticlesByContributorSlug(supabase, slug),
  ]);

  if (!person) {
    notFound();
  }

  const canonicalUrl = `${SITE_URL}/contributors/${person.slug}`;

  // Person structured data — built strictly from the saved record. Fields
  // with no value are omitted entirely rather than invented.
  const personJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    jobTitle: person.role,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
  };
  if (person.bio) personJsonLd.description = person.bio;
  if (person.photoUrl) personJsonLd.image = person.photoUrl;
  personJsonLd.worksFor = {
    "@type": "Organization",
    name: "NG Law Digest",
    url: SITE_URL,
  };
  if (byThisContributor.length > 0) {
    personJsonLd.subjectOf = byThisContributor.map((article) => ({
      "@type": "Article",
      headline: article.title,
      url: `${SITE_URL}/articles/${article.slug}`,
    }));
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-6 py-16">
      <nav aria-label="Breadcrumb" className="mb-10">
        <ol className="flex flex-wrap items-center gap-1.5 font-utility text-[10px] uppercase tracking-[0.12em] text-stone">
          <li>
            <Link href="/" className="transition-colors hover:text-digest-red">
              Home
            </Link>
          </li>
          <li className="text-hairline">&gt;</li>
          <li>
            <Link
              href="/contributors"
              className="transition-colors hover:text-digest-red"
            >
              Editorial Board
            </Link>
          </li>
          <li className="text-hairline">&gt;</li>
          <li className="text-ink">{person.name}</li>
        </ol>
      </nav>

      <Reveal>
        {/* Profile hero — professional layout, image never cropped to a
            harsh fixed ratio (ContributorAvatar preserves the full photo). */}
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <ContributorAvatar
            name={person.name}
            photoUrl={person.photoUrl}
            size="xl"
          />
          <div>
            <p className="font-utility text-[10px] uppercase tracking-[0.2em] text-digest-red">
              NG Law Digest
            </p>
            <h1 className="mt-2 font-display text-3xl italic leading-tight text-ink md:text-4xl">
              {person.name}
            </h1>
            <p className="mt-2 font-admin text-sm font-medium text-stone">
              {person.role}
            </p>
          </div>
        </div>

        {/* Biography / About — rendered only when saved. */}
        <div className="mt-10 border-t border-hairline pt-8">
          <h2 className="font-utility text-xs uppercase tracking-wide text-stone">
            About
          </h2>
          <div className="mt-4 font-body text-sm leading-relaxed text-stone">
            {person.bio ? (
              <p className="whitespace-pre-line">{person.bio}</p>
            ) : (
              <p>
                A full biography has not been added yet — this profile currently
                shows only the confirmed name and role from the masthead.
              </p>
            )}
          </div>
        </div>

        {/* Articles by this person — only when they exist. */}
        {byThisContributor.length > 0 ? (
          <div className="mt-10 border-t border-hairline pt-8">
            <h2 className="font-utility text-xs uppercase tracking-wide text-stone">
              Articles in this issue
            </h2>
            <ul className="mt-4 space-y-3">
              {byThisContributor.map((article) => (
                <li key={article.slug} className="flex items-center gap-3">
                  <PageNumberBadge page={article.page} />
                  <Link
                    href={`/articles/${article.slug}`}
                    className="font-display text-base italic text-ink transition-colors duration-300 hover:text-digest-red"
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Reveal>
      </div>
    </>
  );
}
