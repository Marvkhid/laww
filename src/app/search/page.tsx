import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/section-heading";
import { SearchInput } from "@/components/forms/search-input";

export const metadata: Metadata = {
  title: "Search — Law Digest",
  description: "Search Law Digest.",
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <SectionHeading eyebrow="Search" title="Find what you're looking for" />
      <SearchInput />
      <p className="mt-6 font-body text-sm text-stone">
        Search results aren&rsquo;t wired up yet — this page is the interface shell,
        ready for the search index in a later milestone.
      </p>
    </div>
  );
}
