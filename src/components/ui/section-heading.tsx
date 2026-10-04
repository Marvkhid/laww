export function SectionHeading({
  eyebrow,
  title,
  level = "h2",
}: {
  eyebrow: string;
  title: string;
  /**
   * `h2` for a section inside a page, `h1` when the heading IS the page's
   * title. Every page needs exactly one `h1` so assistive technology and
   * crawlers can identify the page from its own heading; without it the
   * hierarchy starts at `h2` and the page has no name of its own.
   */
  level?: "h1" | "h2";
}) {
  const Heading = level;
  return (
    <div className="mb-10">
      <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
        § {eyebrow}
      </p>
      <div className="mt-3 flex items-end gap-4">
        <Heading className="font-display text-3xl italic leading-tight text-ink md:text-4xl">
          {title}
        </Heading>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="block h-px flex-1 bg-hairline" />
        <span className="block h-1.5 w-1.5 bg-digest-red" />
        <span className="block h-px flex-1 bg-hairline" />
      </div>
    </div>
  );
}