"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Centered circular loading indicator that appears during route transitions.
 * A semi-transparent backdrop with a rotating ring — visible but not intrusive.
 */
export function RouteLoadingBar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const firstRender = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setLoading(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  if (!loading) return null;

  return (
    <div
      className="route-loader"
      role="progressbar"
      aria-label="Loading page"
      aria-busy="true"
    >
      <div className="route-loader-ring" />
    </div>
  );
}
