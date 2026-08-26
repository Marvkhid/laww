import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getCurrentIssue } from "@/lib/supabase/queries/issues";
import { getCoverStory } from "@/lib/supabase/queries/articles";
import { CoverHeroMotion } from "@/components/home/cover-hero-motion";

export async function CoverHero() {
  const supabase = createSupabaseServerClient();
  const [issueMeta, coverStory] = await Promise.all([
    getCurrentIssue(supabase),
    getCoverStory(supabase),
  ]);

  if (!coverStory) return null;

  return (
    <section className="border-b border-hairline bg-paper">
      <div className="relative mx-auto max-w-6xl">
        {/* Full editorial composition: image + overlay text panel */}
        <div className="relative aspect-[16/9] w-full overflow-hidden md:aspect-[21/9]">
          {/* Main cover image — occupies the full composition */}
          {coverStory.coverImageUrl ? (
            <Image
              src={coverStory.coverImageUrl}
              alt={coverStory.imageAlt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-hairline/40">
              <span className="font-utility text-xs uppercase tracking-wide text-stone">
                Cover image pending
              </span>
            </div>
          )}

          {/* Editorial accent corners */}
          <div className="absolute top-0 left-0 h-24 w-24 bg-gradient-to-br from-digest-red/10 to-transparent" />
          <div className="absolute bottom-0 right-0 h-32 w-32 bg-gradient-to-tl from-ink/15 to-transparent" />

          {/* Text overlay panel — cream editorial panel positioned over the image */}
          <CoverHeroMotion
            eyebrow={`§ Cover Story${
              issueMeta
                ? ` · Issue ${issueMeta.issueNumber}, ${issueMeta.season} ${issueMeta.year}`
                : ""
            }`}
            subjectName={coverStory.title}
            subjectRole={
              coverStory.author.name +
              (coverStory.author.credentials
                ? `, ${coverStory.author.credentials}`
                : "")
            }
            dek={coverStory.dek ?? ""}
            slug={coverStory.slug}
          />
        </div>
      </div>
    </section>
  );
}
