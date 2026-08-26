import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import type { HomepageHighlight } from "@/lib/types";

function HighlightCard({ highlight }: { highlight: HomepageHighlight }) {
  const hasImage = !!highlight.imageUrl;
  const hasText = !!(highlight.title || highlight.content || highlight.caption);
  const imagePosition = highlight.imagePosition ?? "left";
  const isImageRight = imagePosition === "right";

  // Image-only highlight: no text content at all
  if (hasImage && !hasText) {
    return (
      <div className="group overflow-hidden border-t-2 border-hairline transition-border-color duration-300 hover:border-digest-red">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={highlight.imageUrl!}
          alt={highlight.title || ""}
          className="w-full h-auto"
        />
      </div>
    );
  }

  // Image + text side-by-side
  if (hasImage && hasText) {
    const imageBlock = (
      <div className="shrink-0 w-full md:w-1/2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={highlight.imageUrl!}
          alt={highlight.title || ""}
          className="w-full h-auto"
        />
      </div>
    );

    const textBlock = (
      <div className="flex flex-col justify-center py-4 md:py-0 md:px-6">
        {highlight.category ? (
          <p className="font-utility text-[10px] uppercase tracking-[0.15em] text-purple">
            § {highlight.category}
          </p>
        ) : null}
        {highlight.title ? (
          <h3 className="mt-2 font-display text-lg italic text-ink">
            {highlight.title}
          </h3>
        ) : null}
        {highlight.content ? (
          <p className="mt-2 font-body text-sm leading-relaxed text-stone">
            {highlight.content}
          </p>
        ) : null}
        {highlight.caption ? (
          <p className="mt-2 font-utility text-[10px] uppercase tracking-wide text-stone">
            {highlight.caption}
          </p>
        ) : null}
      </div>
    );

    return (
      <div className="group flex flex-col md:flex-row border-t-2 border-hairline pt-4 transition-border-color duration-300 hover:border-digest-red">
        {isImageRight ? (
          <>
            <div className="md:order-1 md:w-1/2">{textBlock}</div>
            <div className="md:order-2 md:w-1/2">{imageBlock}</div>
          </>
        ) : (
          <>
            <div className="md:order-1 md:w-1/2">{imageBlock}</div>
            <div className="md:order-2 md:w-1/2">{textBlock}</div>
          </>
        )}
      </div>
    );
  }

  // Text-only (no image) — fallback
  return (
    <div className="group border-t-2 border-hairline pt-4 transition-border-color duration-300 hover:border-digest-red">
      {highlight.category ? (
        <p className="font-utility text-[10px] uppercase tracking-[0.15em] text-purple">
          § {highlight.category}
        </p>
      ) : null}
      {highlight.title ? (
        <h3 className="mt-2 font-display text-base italic text-ink transition-colors duration-300 group-hover:text-digest-red line-clamp-2">
          {highlight.title}
        </h3>
      ) : null}
      {highlight.content ? (
        <p className="mt-2 font-body text-sm leading-relaxed text-stone line-clamp-3">
          {highlight.content}
        </p>
      ) : null}
      {highlight.caption ? (
        <p className="mt-2 font-utility text-[10px] uppercase tracking-wide text-stone">
          {highlight.caption}
        </p>
      ) : null}
    </div>
  );
}

export function HomepageHighlights({ highlights }: { highlights: HomepageHighlight[] }) {
  if (highlights.length === 0) return null;

  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <SectionHeading eyebrow="Editorial" title="Highlights" />
        </Reveal>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {highlights.map((highlight, index) => (
            <Reveal key={highlight.id} delay={index * 0.06}>
              <HighlightCard highlight={highlight} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
