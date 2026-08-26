import Link from "next/link";

export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 font-utility text-[10px] uppercase tracking-[0.12em] text-stone">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span className="text-hairline">&gt;</span>
            ) : null}
            {item.href ? (
              <Link
                href={item.href}
                className="transition-colors duration-200 hover:text-digest-red"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-ink">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
