import type { Metadata } from "next";
import Link from "next/link";
import { ClearSubscribersButton } from "./clear-subscribers-button";

export const metadata: Metadata = {
  title: "Admin — Law Digest",
  robots: { index: false, follow: false },
};

const SECTIONS = [
  { name: "Articles", href: "/admin/articles" },
  { name: "Issues", href: "/admin/issues" },
  { name: "Issues Archive", href: "/admin/issues/archive" },
  { name: "Editorial Board", href: "/admin/contributors" },
  { name: "Events", href: "/admin/events" },
  { name: "Practice Areas", href: "/admin/practice-areas" },
  { name: "Legal Questions of the Day", href: "/admin/legal-insights" },
  { name: "Lawyer in the News", href: "/admin/lawyer-news" },
  { name: "Homepage Highlights", href: "/admin/highlights" },
  { name: "Call for Papers", href: "/admin/call-for-papers" },
  { name: "Breaking Legal Updates", href: "/admin/legal-updates" },
  { name: "Sponsors", href: "/admin/sponsors" },
] as const;

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">Dashboard</h1>
      <p className="mt-2 font-admin text-sm text-[#333]">You&rsquo;re signed in.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {SECTIONS.map((section) => (
          <li key={section.name} className="border border-hairline bg-paper-warm px-5 py-4 transition-colors hover:bg-ink">
            <Link href={section.href} className="font-admin text-sm font-semibold text-ink hover:text-paper">
              {section.name}
            </Link>
          </li>
        ))}
      </ul>
      <ClearSubscribersButton />
    </div>
  );
}
