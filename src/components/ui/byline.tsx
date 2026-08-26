import type { Author } from "@/lib/types";
import { ContributorAvatar } from "@/components/ui/contributor-avatar";

export function Byline({
  author,
  page,
  showPhoto = false,
  date,
}: {
  author: Author;
  page?: number;
  showPhoto?: boolean;
  date?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {showPhoto ? (
        <ContributorAvatar
          name={author.name}
          photoUrl={author.photoUrl}
          size="sm"
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-x-1">
        <p className="font-utility text-[11px] uppercase tracking-wide text-ink">
          {author.name}
          {author.credentials ? (
            <span className="text-stone">, {author.credentials}</span>
          ) : null}
        </p>
        {typeof page === "number" && page > 0 ? (
          <p className="font-utility text-[10px] uppercase tracking-wide text-stone">
            · p. {page}
          </p>
        ) : null}
        {date ? (
          <p className="font-utility text-[10px] uppercase tracking-wide text-stone">
            · {date}
          </p>
        ) : null}
      </div>
    </div>
  );
}
