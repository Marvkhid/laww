"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Client component that hides its children on routes matching `except`.
 * Used to wrap server components that should only render on public routes.
 */
export function RouteVisibility({
  children,
  except,
}: {
  children: ReactNode;
  except: string;
}) {
  const pathname = usePathname();
  if (pathname.startsWith(except)) return null;
  return <>{children}</>;
}
