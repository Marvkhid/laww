export function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-10">
      <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
        § {eyebrow}
      </p>
      <div className="mt-3 flex items-end gap-4">
        <h2 className="font-display text-3xl italic leading-tight text-ink md:text-4xl">
          {title}
        </h2>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="block h-px flex-1 bg-hairline" />
        <span className="block h-1.5 w-1.5 bg-digest-red" />
        <span className="block h-px flex-1 bg-hairline" />
      </div>
    </div>
  );
}
