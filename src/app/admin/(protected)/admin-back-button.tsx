import Link from "next/link";

export function AdminBackButton() {
  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1 font-admin text-xs font-semibold uppercase tracking-wide text-stone transition-colors hover:text-digest-red"
    >
      <span aria-hidden="true">&larr;</span> Admin Dashboard
    </Link>
  );
}
