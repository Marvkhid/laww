export function PlaceholderImage({
  label,
  aspect = "aspect-[4/3]",
}: {
  label: string;
  aspect?: string;
}) {
  return (
    <div
      className={`${aspect} flex items-end bg-hairline/60 p-3`}
      role="img"
      aria-label={label}
    >
      <span className="font-utility text-[10px] uppercase tracking-wide text-stone">
        Image pending — {label}
      </span>
    </div>
  );
}
