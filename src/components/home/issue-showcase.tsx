import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getCurrentIssue } from "@/lib/supabase/queries/issues";
import { Reveal } from "@/components/motion/reveal";

export async function IssueShowcase() {
  const supabase = createSupabaseServerClient();
  const issueMeta = await getCurrentIssue(supabase);

  if (!issueMeta) return null;

  return (
    <section className="border-t border-hairline">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-[1fr_320px] md:items-center">
        <Reveal>
          <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-purple">
            § Digital Edition
          </p>
          <h2 className="mt-3 font-display text-3xl italic text-ink md:text-4xl">
            Issue {issueMeta.issueNumber}
          </h2>
          <p className="mt-3 font-body text-base text-stone">
            {issueMeta.season} {issueMeta.year} · {issueMeta.edition}
          </p>
          <div className="mt-8 flex items-center gap-6">
            {issueMeta.pdfUrl ? (
              <a
                href={issueMeta.pdfUrl}
                download
                className="inline-block bg-digest-red px-6 py-3 font-admin text-sm font-semibold uppercase tracking-wide text-paper transition-opacity hover:opacity-80"
              >
                Download PDF
              </a>
            ) : (
              <a
                href="/law-digest-issue.pdf"
                download
                className="inline-block bg-digest-red px-6 py-3 font-admin text-sm font-semibold uppercase tracking-wide text-paper transition-opacity hover:opacity-80"
              >
                Download PDF
              </a>
            )}
            <span className="font-utility text-[11px] uppercase tracking-wide text-stone">
              PDF Edition
            </span>
          </div>            {issueMeta.priceNigeria ? (
            <div className="mt-6 flex gap-6 font-utility text-[11px] uppercase tracking-wide text-stone">
              <span>NGN {issueMeta.priceNigeria}</span>
              <span>UK {issueMeta.priceUK}</span>
              <span>US {issueMeta.priceUS}</span>
            </div>
          ) : null}
        </Reveal>
        <Reveal delay={0.15}>
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[280px] overflow-hidden shadow-2xl md:mx-0 md:ml-auto">
            {issueMeta.coverImageSrc ? (
              <Image
                src={issueMeta.coverImageSrc}
                alt={issueMeta.coverImageAlt}
                fill
                sizes="(min-width: 768px) 280px, 100vw"
                className="object-contain transition-transform duration-700 hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-hairline/20 p-4">
                <span className="font-utility text-[10px] uppercase tracking-wide text-stone">
                  Cover image pending
                </span>
              </div>
            )}
            {/* Editorial corner accent */}
            <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-purple/20 to-transparent" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
