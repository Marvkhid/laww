import Link from "next/link";
import type { Article } from "@/lib/types";
import { PageNumberBadge } from "@/components/ui/page-number-badge";
import { Byline } from "@/components/ui/byline";
import { ArticleCoverImage } from "@/components/ui/article-cover-image";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/articles/${article.slug}`} className="group block">
      {/* Image section with editorial hover */}
      <div className="relative overflow-hidden">
        <ArticleCoverImage
          src={article.coverImageUrl}
          alt={article.imageAlt}
          aspect="aspect-[16/10]"
        />
        {/* Hover overlay — subtle editorial lift */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        {/* Red accent line that slides in on hover */}
        <div className="absolute bottom-0 left-0 h-[3px] w-0 bg-digest-red transition-all duration-500 group-hover:w-full" />
      </div>

      {/* Content section */}
      <div className="mt-4 grid grid-cols-[auto_1fr] gap-3">
        <PageNumberBadge page={article.page} />
        <div className="min-w-0">
          {article.practiceArea ? (
            <p className="font-utility text-[10px] uppercase tracking-[0.15em] text-digest-red">
              § {article.practiceArea}
            </p>
          ) : null}
          <h3 className="mt-1 font-display text-xl italic text-ink decoration-2 underline-offset-4 transition-colors duration-300 group-hover:text-digest-red line-clamp-3">
            {article.title}
          </h3>
          {article.dek ? (
            <p className="mt-2 font-body text-sm leading-relaxed text-stone line-clamp-2">
              {article.dek}
            </p>
          ) : null}
          <div className="mt-2">
            <Byline author={article.author} />
          </div>
        </div>
      </div>
    </Link>
  );
}
