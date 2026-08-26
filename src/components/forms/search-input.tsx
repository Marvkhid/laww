"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export function SearchInput() {
  const [query, setQuery] = useState("");

  return (
    <form
      className="flex items-center gap-3 border border-hairline px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        // Search is not wired up yet — the index/backend lands in a later milestone.
      }}
    >
      <Search size={18} className="shrink-0 text-stone" aria-hidden="true" />
      <label htmlFor="site-search" className="sr-only">
        Search Law Digest
      </label>
      <input
        id="site-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search articles, contributors, practice areas…"
        className="w-full font-admin text-sm text-ink placeholder:text-stone focus:outline-none"
      />
    </form>
  );
}
