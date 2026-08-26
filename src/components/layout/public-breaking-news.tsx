"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import {
  BreakingLegalUpdates,
  BreakingLegalUpdatesSkeleton,
} from "../home/breaking-legal-updates";

export function PublicBreakingNews() {
  const pathname = usePathname();

  // Never show breaking news inside the admin dashboard.
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <Suspense fallback={<BreakingLegalUpdatesSkeleton />}>
      <BreakingLegalUpdates />
    </Suspense>
  );
}