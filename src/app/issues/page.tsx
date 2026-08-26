import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getCurrentIssue } from "@/lib/supabase/queries/issues";
import { getArchivedIssues } from "@/lib/supabase/queries/issues-archive";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Gavel } from "@/components/ui/editorial-illustration";

export const metadata: Metadata = {
  title: "Issues — Law Digest",
  description: "Browse Law Digest issues and the archive.",
};

export default async function IssuesPage() {
  const supabase = createSupabaseServerClient();
  const [issueMeta, archivedIssues] = await Promise.all([
    getCurrentIssue(supabase),
    getArchivedIssues(supabase),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Reveal>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Issues" title="Issue archive" />
          <Gavel className="h-20 w-20 shrink-0 opacity-20" />
        </div>

        {/* Current Issue */}
        {issueMeta ? (
          <Link
            href={`/issues/issue-${issueMeta.issueNumber}`}
            className="group grid gap-8 border border-hairline p-6 transition-shadow duration-300 hover:shadow-lg md:grid-cols-[200px_1fr] md:items-center"
          >
            <div className="relative aspect-[3/4] w-full max-w-[200px] overflow-hidden">
              {issueMeta.coverImageSrc ? (
                <Image
                  src={issueMeta.coverImageSrc}
                  alt={issueMeta.coverImageAlt}
                  fill
                  sizes="200px"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-hairline/60 p-4">
                  <span className="font-utility text-[10px] uppercase tracking-wide text-stone">
                    Cover pending
                  </span>
                </div>
              )}
            </div>
            <div>
              <p className="font-utility text-xs uppercase tracking-wide text-purple">
                Current Issue
              </p>
              <h2 className="mt-2 font-display text-2xl italic text-ink">
                Issue {issueMeta.issueNumber}
              </h2>
              <p className="mt-1 font-body text-sm text-stone">
                {issueMeta.season} {issueMeta.year} · {issueMeta.edition}
              </p>
            </div>
          </Link>
        ) : null}
      </Reveal>

      {/* Archived Issues */}
      {archivedIssues.length > 0 ? (
        <Reveal delay={0.1}>
          <h2 className="mt-16 mb-8 font-utility text-[11px] uppercase tracking-[0.2em] text-purple">
            Previous Issues
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {archivedIssues.map((issue, index) => (
              <Reveal key={issue.slug} delay={0.1 + index * 0.06}>
                <div className="group overflow-hidden border border-hairline transition-shadow duration-300 hover:shadow-lg">
                  <div className="relative aspect-[3/4] w-full overflow-hidden">
                    {issue.coverImageUrl ? (
                      <Image
                        src={issue.coverImageUrl}
                        alt={issue.title}
                        fill
                        sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-hairline/60 p-4">
                        <span className="font-utility text-[10px] uppercase tracking-wide text-stone">
                          Cover pending
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-lg italic text-ink">
                      {issue.title}
                    </h3>
                    {issue.description ? (
                      <p className="mt-2 line-clamp-2 font-body text-sm text-stone">
                        {issue.description}
                      </p>
                    ) : null}
                    {issue.pdfUrl ? (
                      <a
                        href={issue.pdfUrl}
                        download
                        className="mt-3 inline-block border-b border-digest-red font-utility text-[10px] uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
                      >
                        Download PDF
                      </a>
                    ) : null}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      ) : null}
    </div>
  );
}
