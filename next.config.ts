import type { NextConfig } from "next";

import {
  ACTION_BODY_LIMIT,
  assertRequestLimits,
} from "./src/lib/request-limits";

// Fail the build (and the dev server) rather than ship request-body limits
// that let a Server Action request reach the host's 413 wall. See
// src/lib/request-limits.ts and e2e/body-limits.spec.ts.
assertRequestLimits();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wsuvvbkxopbkvcmcvptf.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    // Server Actions are the only handler on this site that reads a request
    // body, and the production host rejects a Function body of 4 500 000 bytes
    // or more before the app runs (measured: 4 400 000 B → 405, 4 500 000 B →
    // 413 FUNCTION_PAYLOAD_TOO_LARGE). This ceiling therefore has to sit well
    // BELOW the host's wall — "50mb" here used to advertise a limit only
    // Next.js enforced, which is how a 4.8 MB upload became an unexplained
    // 413. 2 MB is ~10× the largest legitimate payload (a long article's
    // rich-text JSON); the editor itself refuses anything over 1.5 MB first
    // and says why (see src/lib/request-limits.ts).
    serverActions: {
      bodySizeLimit: ACTION_BODY_LIMIT,
    },
  },
};

export default nextConfig;
