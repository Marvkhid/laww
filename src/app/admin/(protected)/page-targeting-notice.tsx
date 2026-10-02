import Link from "next/link";

/**
 * Shown on the admin forms when migration 0025 (page targeting) has not been
 * applied yet — an honest "this control is not live" message rather than
 * checkboxes that accept a selection and then quietly lose it.
 */
export function PageTargetingNotice() {
  return (
    <div className="border border-digest-red/40 bg-digest-red/[0.04] p-4">
      <p className="font-admin text-xs font-semibold uppercase tracking-[0.12em] text-digest-red">
        Page targeting not active yet
      </p>
      <p className="mt-1.5 font-admin text-xs leading-relaxed text-[#333]">
        Run{" "}
        <code className="bg-white px-1 py-0.5 text-[11px]">
          supabase/migrations/0025_page_visibility.sql
        </code>{" "}
        against the project database, then reload this page to enable the
        &ldquo;Display On&rdquo; controls. Until then, content keeps showing in
        its current locations — nothing you save here is lost.
      </p>
      <Link
        href="/admin"
        className="mt-2 inline-block font-admin text-xs font-semibold uppercase tracking-wide text-digest-red hover:text-digest-red-deep"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
