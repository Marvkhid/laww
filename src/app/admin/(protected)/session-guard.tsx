"use client";

import { useEffect } from "react";
import { assertAdminSession } from "@/app/admin/(protected)/session-actions";

/**
 * Re-check the session when a page is restored from the back/forward cache.
 *
 * Scenario this exists for: the admin is on /admin/articles, follows a link to
 * the public site (which ends the session server-side), then presses Back. The
 * browser can restore the previous DOM from its back/forward cache without
 * asking the server anything, so the dashboard would *look* signed in even
 * though it is not.
 *
 * It is not the security boundary — the server is (every protected page and
 * action re-verifies the session, so the restored page can neither read nor
 * write anything). It is the honest-UI half: rather than let the admin
 * discover the session is gone by clicking and being bounced, ask once and
 * replace the entry with the login screen.
 */
export function AdminSessionGuard() {
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const live = await assertAdminSession();
        if (!cancelled && !live) window.location.replace("/admin/login");
      } catch {
        // A failed check proves nothing about the session; the next protected
        // request still enforces it server-side.
      }
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void check();
    };

    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
