/**
 * The deployed host's request-body wall — measured, not remembered.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * `request-limits.ts` encodes a ceiling (4 500 000 B) that was measured by hand
 * once. Nothing re-checked it afterwards, and "a number written down in one
 * place that reality quietly disagrees with" is exactly how the original 413
 * happened: the host's wall, the framework's `bodySizeLimit` and the limits the
 * UI advertised were three unrelated values, and only production knew.
 *
 * This module turns that one-off measurement into something a deploy can run.
 *
 * ── How the wall is measured ────────────────────────────────────────────────
 * POST a body of a known size to a route that answers **GET only**. The
 * platform refuses an oversized request before the app is reached
 * (`413 FUNCTION_PAYLOAD_TOO_LARGE`); a body under the ceiling reaches the app,
 * which answers `405 Method Not Allowed` because no POST handler is exported.
 * One probe per size therefore says which side of the wall that size is on —
 * no handler runs, and nothing is written by any probe.
 *
 * The ladder is derived from the shipped constants, so the check speaks up when
 * *either* side moves: the host dropping its wall below what the app accepts,
 * the host moving it anywhere else, or the app raising a limit past the wall.
 *
 * ── Cost ────────────────────────────────────────────────────────────────────
 * A clean run uploads ~11 MB (1 KB, 2 MB, wall−100 KB, wall). Escalation adds
 * one 9 MB probe (only if nothing was refused, i.e. the wall moved up), and
 * refinement adds a few bisection probes (only when drift is detected).
 * `judgeWallProbes` is pure, so the loud-failure behaviour is itself tested
 * against hostile values rather than trusted — see e2e/platform-wall.spec.ts.
 */

import {
  ACTION_BODY_LIMIT_BYTES,
  CLIENT_PAYLOAD_LIMIT_BYTES,
  PLATFORM_BODY_WALL_BYTES,
} from "./request-limits";

/**
 * The probe target: a public route that exports GET only.
 *
 * `/api/unsubscribe` fits because it is public (no session, no secret), it
 * writes only on GET, and a POST can never reach it. If this route ever gains a
 * POST handler, or is removed, the sanity probe below fails loudly instead of
 * quietly measuring nothing.
 */
export const WALL_PROBE_PATH = "/api/unsubscribe";

export type ProbeRole =
  | "sanity"
  | "app-ceiling"
  | "below-wall"
  | "wall"
  | "above-wall"
  | "refine";

export type ProbeSpec = { role: ProbeRole; label: string; bytes: number };
export type ProbeResult = ProbeSpec & {
  /** HTTP status, or 0 when the request never produced a response. */
  status: number;
  /** Set when the probe could not complete (connection reset, timeout). */
  error?: string;
  finalUrl?: string;
};

export type WallVerdict = {
  ok: boolean;
  /** Largest probed size the host accepted (or null if none was accepted). */
  acceptedUpToBytes: number | null;
  /** Smallest probed size the host refused with 413 (or null if none). */
  refusedFromBytes: number | null;
  problems: string[];
};

const KB = 1_000;
const MB = 1_000_000;

/** Megabytes as the rest of the codebase writes them (decimal, one place). */
export function mb(bytes: number): string {
  return `${(bytes / MB).toFixed(1)} MB`;
}

/** The measurement ladder, derived from the constants the app ships with. */
export function wallProbeSpecs(
  declaredWallBytes: number = PLATFORM_BODY_WALL_BYTES
): ProbeSpec[] {
  return [
    {
      role: "sanity",
      label: "1 KB — the probe route exists and answers",
      bytes: 1 * KB,
    },
    {
      role: "app-ceiling",
      label: `the app's own Server Action ceiling (${mb(ACTION_BODY_LIMIT_BYTES)})`,
      bytes: ACTION_BODY_LIMIT_BYTES,
    },
    {
      role: "below-wall",
      label: `just below the recorded wall (${mb(declaredWallBytes - 100 * KB)})`,
      bytes: declaredWallBytes - 100 * KB,
    },
    {
      role: "wall",
      label: `the recorded wall (${mb(declaredWallBytes)})`,
      bytes: declaredWallBytes,
    },
  ];
}

/** Size of the escalation probe used when nothing was refused at all. */
export function escalationBytes(
  declaredWallBytes: number = PLATFORM_BODY_WALL_BYTES
): number {
  return declaredWallBytes * 2;
}

/**
 * Decide what a set of probe results says about the wall.
 *
 * Pure and total: every probe is accounted for, and anything that stops the
 * measurement from meaning something (a missing route, a probe that never
 * completed) is reported as a problem rather than folded into a verdict.
 */
export function judgeWallProbes(
  results: ProbeResult[],
  declaredWallBytes: number = PLATFORM_BODY_WALL_BYTES
): WallVerdict {
  const problems: string[] = [];
  const probed = results.filter((r) => r.role !== "sanity");
  const sanity = results.find((r) => r.role === "sanity");

  if (sanity) {
    if (sanity.status === 404) {
      problems.push(
        `${WALL_PROBE_PATH} is not in this deployment (404). The wall cannot be ` +
          `measured without a GET-only route to POST to.`
      );
    } else if (sanity.status === 0) {
      problems.push(
        `the probe route did not answer at all (${sanity.error ?? "no response"}).`
      );
    } else if (sanity.status >= 500) {
      problems.push(
        `${WALL_PROBE_PATH} answered ${sanity.status}; that is not a wall measurement.`
      );
    }
  }

  const incomplete = probed.filter((r) => r.status === 0);
  for (const probe of incomplete) {
    problems.push(
      `the ${probe.label} probe did not complete (${probe.error ?? "no response"}) ` +
        `— the host may be dropping the connection mid-body. Re-run; if it ` +
        `persists, measure by hand and update PLATFORM_BODY_WALL_BYTES.`
    );
  }

  const refusals = probed.filter((r) => r.status === 413);
  const accepted = probed.filter((r) => r.status !== 413 && r.status !== 0);
  const refusedFromBytes =
    refusals.length > 0 ? Math.min(...refusals.map((r) => r.bytes)) : null;
  const acceptedUpToBytes =
    accepted.length > 0 ? Math.max(...accepted.map((r) => r.bytes)) : null;

  const ceilingProbe = results.find((r) => r.role === "app-ceiling");
  if (ceilingProbe && ceilingProbe.status === 413) {
    problems.push(
      `the app's own Server Action ceiling (${mb(ACTION_BODY_LIMIT_BYTES)}) is ` +
        `already refused by the host — legitimate saves of that size would 413. ` +
        `The host's wall is now at or below ${mb(ACTION_BODY_LIMIT_BYTES)}.`
    );
  }

  if (refusedFromBytes === null) {
    const biggest = acceptedUpToBytes ?? 0;
    problems.push(
      `nothing up to ${mb(biggest)} was refused, so the recorded wall ` +
        `(${mb(declaredWallBytes)}) is no longer the boundary: either the host ` +
        `raised it or ${WALL_PROBE_PATH} is no longer running as a Function. ` +
        `Re-measure, then update PLATFORM_BODY_WALL_BYTES in src/lib/request-limits.ts.`
    );
  } else if (refusedFromBytes !== declaredWallBytes) {
    const below = refusedFromBytes < declaredWallBytes;
    problems.push(
      `the host's wall has moved ${below ? "down" : "up"}: it refuses ` +
        `${mb(refusedFromBytes)} and accepts ${mb(acceptedUpToBytes ?? 0)}, but ` +
        `PLATFORM_BODY_WALL_BYTES records ${mb(declaredWallBytes)}. ` +
        (below
          ? `Any request sized between the two is a 413 the app cannot explain ` +
            `to an editor — treat this as an outage and lower the app's limits.`
          : `The app is stricter than it has to be (safe, but the recorded ` +
            `measurement is wrong, and every guard is anchored to it).`)
    );
  }

  return {
    ok: problems.length === 0,
    acceptedUpToBytes,
    refusedFromBytes,
    problems,
  };
}

export type WallMeasurement = {
  baseUrl: string;
  path: string;
  declaredWallBytes: number;
  probes: ProbeResult[];
  verdict: WallVerdict;
  /** One-line summary for a log or a failure message. */
  summary: string;
};

export type ProbeBody = (bytes: number) => ArrayBuffer;

/**
 * A body that is cheap to build and impossible to interpret as anything.
 *
 * An `ArrayBuffer` rather than a `Uint8Array` on purpose: it is exactly the
 * bytes we asked for, it is a valid `BodyInit` without a cast, and a probe of a
 * known size is all this measurement needs — no view, no encoding.
 */
export function zeroBody(bytes: number): ArrayBuffer {
  return new ArrayBuffer(bytes);
}

export type MeasureOptions = {
  baseUrl: string;
  /** Defaults to WALL_PROBE_PATH. */
  path?: string;
  /** Defaults to the shipped PLATFORM_BODY_WALL_BYTES. */
  declaredWallBytes?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
  body?: ProbeBody;
  /** Per-probe limit; a body this size over a phone line is still fast. */
  probeTimeoutMs?: number;
  /** Bisect between the accepted and refused probes to name the boundary. */
  refine?: boolean;
};

/**
 * Probe the deployment and judge the result. Never throws for a bad verdict —
 * a drift is an answer, not an exception — but does throw if the target URL is
 * unusable, because that means the check itself is misconfigured.
 */
export async function measurePlatformWall(
  options: MeasureOptions
): Promise<WallMeasurement> {
  const {
    baseUrl,
    path = WALL_PROBE_PATH,
    declaredWallBytes = PLATFORM_BODY_WALL_BYTES,
    fetchImpl = fetch,
    body = zeroBody,
    probeTimeoutMs = 90_000,
    refine = true,
  } = options;

  if (!/^https?:\/\//.test(baseUrl)) {
    throw new Error(
      `measurePlatformWall needs an absolute http(s) base URL, got ${JSON.stringify(baseUrl)}.`
    );
  }

  const probes: ProbeResult[] = [];
  const run = async (spec: ProbeSpec): Promise<ProbeResult> => {
    let status = 0;
    let error: string | undefined;
    let finalUrl: string | undefined;
    try {
      const response = await fetchImpl(new URL(path, baseUrl), {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: body(spec.bytes),
        signal: AbortSignal.timeout(probeTimeoutMs),
      });
      status = response.status;
      finalUrl = response.url;
      // Drain, so the socket can be reused for the next, larger probe.
      await response.arrayBuffer().catch(() => undefined);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
    const result: ProbeResult = { ...spec, status, error, finalUrl };
    probes.push(result);
    return result;
  };

  for (const spec of wallProbeSpecs(declaredWallBytes)) {
    await run(spec);
  }

  // Nothing was refused: the boundary is above the recorded wall (or the probe
  // route is no longer a Function). One escalation probe separates those.
  const refusedSoFar = probes.some((p) => p.status === 413);
  if (!refusedSoFar) {
    await run({
      role: "above-wall",
      label: `${mb(escalationBytes(declaredWallBytes))} — double the recorded wall`,
      bytes: escalationBytes(declaredWallBytes),
    });
  }

  // Drift: bisect between the largest accepted and the smallest refused probe
  // so the failure names the real boundary instead of only saying "moved".
  const refusals = probes.filter((p) => p.status === 413);
  const accepted = probes.filter((p) => p.status !== 413 && p.status !== 0);
  if (refine && refusals.length > 0) {
    let low = accepted.length > 0 ? Math.max(...accepted.map((p) => p.bytes)) : 0;
    let high = Math.min(...refusals.map((p) => p.bytes));
    let step = 0;
    while (high - low > 100 * KB && step < 4) {
      const mid = Math.floor((low + high) / 2);
      const result = await run({
        role: "refine",
        label: `bisect ${mb(mid)}`,
        bytes: mid,
      });
      if (result.status === 413) high = mid;
      else if (result.status === 0) break; // incomplete probe already reported
      else low = mid;
      step += 1;
    }
  }

  const verdict = judgeWallProbes(probes, declaredWallBytes);
  const measured = verdict.refusedFromBytes;
  const summary = verdict.ok
    ? `wall confirmed: accepts ${mb(verdict.acceptedUpToBytes ?? 0)}, refuses ` +
      `${mb(measured!)}, app ceiling ${mb(ACTION_BODY_LIMIT_BYTES)}, editor cap ` +
      `${mb(CLIENT_PAYLOAD_LIMIT_BYTES)}`
    : `wall measurement disagrees with the shipped limits: ${verdict.problems.join(" ")}`;

  return { baseUrl, path, declaredWallBytes, probes, verdict, summary };
}
