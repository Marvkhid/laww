import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full border-2 border-hairline">
        <span className="font-display text-3xl font-bold italic text-digest-red">∅</span>
      </div>

      <h1 className="font-display text-3xl font-bold italic text-ink md:text-4xl">
        Page Unavailable
      </h1>

      <p className="mt-4 max-w-md font-body text-base leading-relaxed text-stone">
        The story or page you&apos;re looking for is no longer available or could not
        be found. It may have been moved, updated, or removed.
      </p>

      <Link
        href="/"
        className="mt-8 inline-block border-b-2 border-digest-red pb-1 font-utility text-[11px] font-semibold uppercase tracking-[0.15em] text-digest-red transition-opacity hover:opacity-70"
      >
        ← Back to Law Digest
      </Link>
    </div>
  );
}
