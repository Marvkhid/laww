import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  ACTION_BODY_LIMIT_BYTES,
  CLIENT_PAYLOAD_LIMIT_BYTES,
  PLATFORM_BODY_WALL_BYTES,
} from "../src/lib/request-limits";
import {
  escalationBytes,
  mb,
  measurePlatformWall,
  wallProbeSpecs,
  WALL_PROBE_PATH,
} from "../src/lib/platform-wall";

/**
 * The deployed host's request-body wall — a smoke check, not a memory.
 *
 * Two halves, deliberately:
 *
 *  · A **fake platform** (below) is a real HTTP server that refuses bodies at
 *    or above a configurable size exactly the way the host does — 413 for the
 *    too-big body, 405 for the ones that reach the GET-only probe route. That
 *    is how the *loud failure* is proven: an unchanged wall passes, and a wall
 *    that moves up, moves down, drops below the app's own ceiling, never
 *    refuses, or answers 404 is reported as a problem. None of that can be
 *    tested against the real host, where the wall is whatever it is.
 *  · A **live measurement** of the deployment named by `E2E_BASE_URL`, which is
 *    skipped with an explicit reason anywhere it cannot mean anything (a
 *    localhost build has no platform wall in front of it).
 *
 * Run the live half against production with:
 *
 *   E2E_BASE_URL=https://www.nglawdigestblog.com \
 *     npx playwright test platform-wall --project=node
 *
 * Every probe is a POST to a GET-only route: no handler runs and nothing is
 * written, so the check is safe to run against production. A clean run uploads
 * ~11 MB; see src/lib/platform-wall.ts for what the escalation and bisection
 * probes add when the wall has moved.
 */

// ── A stand-in for the platform ────────────────────────────────────────────

type FakeOptions = {
  /** The size at or above which the platform refuses the body. */
  wallBytes: number | null;
  /** Refuse mid-upload (destroy the socket) instead of reading then answering. */
  dropAbove?: boolean;
  /** Answer 404 for everything — a deployment without the probe route. */
  notFound?: boolean;
};

type Fake = {
  url: string;
  received: number[];
  close: () => Promise<void>;
};

async function startFakePlatform(options: FakeOptions): Promise<Fake> {
  const received: number[] = [];
  const server: Server = createServer((req, res) => {
    if (options.notFound) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
      return;
    }
    let size = 0;
    let dropped = false;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (
        options.dropAbove &&
        options.wallBytes !== null &&
        size >= options.wallBytes
      ) {
        dropped = true;
        req.destroy();
        res.destroy();
      }
    });
    req.on("end", () => {
      if (dropped) return;
      received.push(size);
      const refused = options.wallBytes !== null && size >= options.wallBytes;
      if (refused) {
        // What the host actually answers, body and all.
        res.writeHead(413, { "content-type": "text/plain" });
        res.end("FUNCTION_PAYLOAD_TOO_LARGE");
        return;
      }
      // A body that reaches the app and finds no POST handler.
      res.writeHead(405, { allow: "GET" });
      res.end();
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    received,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

// ── The ladder is anchored to the shipped limits ───────────────────────────

test.describe("the probe ladder", () => {
  test("is derived from the constants the app ships with", () => {
    const specs = wallProbeSpecs();
    const byRole = (role: string) => specs.filter((s) => s.role === role);

    expect(byRole("sanity")).toHaveLength(1);
    expect(byRole("sanity")[0].bytes).toBeLessThan(10_000);

    // The app's own ceiling is probed, so a wall that drops below it is caught.
    expect(byRole("app-ceiling")[0].bytes).toBe(ACTION_BODY_LIMIT_BYTES);
    // …and the boundary itself is bracketed from below and probed exactly.
    const below = byRole("below-wall")[0].bytes;
    const wall = byRole("wall")[0].bytes;
    expect(wall).toBe(PLATFORM_BODY_WALL_BYTES);
    expect(below).toBeGreaterThan(ACTION_BODY_LIMIT_BYTES);
    expect(below).toBeLessThan(wall);

    // The editor's cap has to stay under both, or the ladder proves nothing.
    expect(CLIENT_PAYLOAD_LIMIT_BYTES).toBeLessThan(ACTION_BODY_LIMIT_BYTES);
    expect(ACTION_BODY_LIMIT_BYTES).toBeLessThan(PLATFORM_BODY_WALL_BYTES);
    expect(escalationBytes()).toBeGreaterThan(wall);
  });

  test("probes the route that a POST cannot reach", () => {
    expect(WALL_PROBE_PATH).toMatch(/^\/api\//);
  });
});

// ── Drift, proven against a platform that can drift on demand ──────────────

test.describe("wall measurement", () => {
  let fake: Fake | null = null;

  test.afterEach(async () => {
    await fake?.close();
    fake = null;
  });

  test("confirms a wall that has not moved", async () => {
    fake = await startFakePlatform({ wallBytes: PLATFORM_BODY_WALL_BYTES });
    const measurement = await measurePlatformWall({ baseUrl: fake.url });

    expect(measurement.verdict.problems).toEqual([]);
    expect(measurement.verdict.ok).toBe(true);
    expect(measurement.verdict.refusedFromBytes).toBe(PLATFORM_BODY_WALL_BYTES);
    expect(measurement.verdict.acceptedUpToBytes).toBeLessThan(
      PLATFORM_BODY_WALL_BYTES
    );
    // The app's own ceiling cleared the wall, which is the property that matters.
    expect(measurement.verdict.acceptedUpToBytes!).toBeGreaterThanOrEqual(
      ACTION_BODY_LIMIT_BYTES
    );
  });

  test("fails loudly when the host lowers its wall below the app's ceiling", async () => {
    fake = await startFakePlatform({ wallBytes: 1_500_000 });
    const measurement = await measurePlatformWall({ baseUrl: fake.url });

    expect(measurement.verdict.ok).toBe(false);
    const text = measurement.verdict.problems.join(" ");
    expect(text).toMatch(/Server Action ceiling/);
    expect(text).toMatch(/moved down|below/);
    // The failure names the numbers, so the fix is obvious from the log alone.
    expect(text).toContain("4.5 MB");
  });

  test("fails loudly when the host lowers its wall but keeps the app's ceiling", async () => {
    fake = await startFakePlatform({ wallBytes: 3_000_000 });
    const measurement = await measurePlatformWall({ baseUrl: fake.url });

    expect(measurement.verdict.ok).toBe(false);
    const text = measurement.verdict.problems.join(" ");
    expect(text).toMatch(/moved down/);
    // The failure names both numbers, so the fix is obvious from a CI log.
    expect(text).toContain(mb(measurement.verdict.refusedFromBytes!));
    expect(text).toContain(mb(PLATFORM_BODY_WALL_BYTES));

    // Bisection is what turns "moved" into an interval that contains the wall.
    expect(measurement.probes.some((p) => p.role === "refine")).toBe(true);
    const accepted = measurement.verdict.acceptedUpToBytes!;
    const refused = measurement.verdict.refusedFromBytes!;
    expect(accepted).toBeLessThan(3_000_000);
    expect(refused).toBeGreaterThanOrEqual(3_000_000);
    // …and a tight one: the boundary is pinned to within one probe step.
    expect(refused - accepted).toBeLessThanOrEqual(200_000);
  });

  test("fails loudly when the host raises its wall", async () => {
    fake = await startFakePlatform({ wallBytes: 9_000_000 });
    const measurement = await measurePlatformWall({ baseUrl: fake.url });

    expect(measurement.verdict.ok).toBe(false);
    const text = measurement.verdict.problems.join(" ");
    expect(text).toMatch(/moved up/);
    expect(text).toMatch(/stricter than it has to be/);
    expect(measurement.verdict.refusedFromBytes).toBe(9_000_000);
  });

  test("reports a deployment where nothing is refused at all", async () => {
    fake = await startFakePlatform({ wallBytes: null });
    const measurement = await measurePlatformWall({ baseUrl: fake.url });

    expect(measurement.verdict.ok).toBe(false);
    expect(measurement.verdict.refusedFromBytes).toBeNull();
    expect(measurement.verdict.problems.join(" ")).toMatch(
      /nothing up to .* was refused/
    );
  });

  test("refuses to conclude anything when the probe route is missing", async () => {
    fake = await startFakePlatform({ wallBytes: PLATFORM_BODY_WALL_BYTES, notFound: true });
    const measurement = await measurePlatformWall({ baseUrl: fake.url });

    expect(measurement.verdict.ok).toBe(false);
    expect(measurement.verdict.problems.join(" ")).toContain(
      `${WALL_PROBE_PATH} is not in this deployment`
    );
  });

  test("reports a probe that never completed instead of inventing a wall", async () => {
    fake = await startFakePlatform({
      wallBytes: PLATFORM_BODY_WALL_BYTES,
      dropAbove: true,
    });
    const measurement = await measurePlatformWall({ baseUrl: fake.url });

    expect(measurement.verdict.ok).toBe(false);
    const text = measurement.verdict.problems.join(" ");
    expect(text).toMatch(/did not complete/);
    // A dropped connection must not be recorded as a refusal…
    expect(measurement.probes.some((p) => p.status === 413)).toBe(false);
    // …nor as an accepted body.
    expect(measurement.verdict.acceptedUpToBytes ?? 0).toBeLessThan(
      PLATFORM_BODY_WALL_BYTES
    );
  });

  test("rejects a target that is not a URL", async () => {
    await expect(
      measurePlatformWall({ baseUrl: "localhost:3000" })
    ).rejects.toThrow(/absolute http/);
  });
});

// ── The deployment itself ──────────────────────────────────────────────────

const TARGET = process.env.E2E_BASE_URL ?? "";
const HAS_DEPLOYMENT = /^https:\/\//.test(TARGET);
const FORCED = process.env.E2E_WALL_MEASURE === "1";

test.describe("the deployed host's wall", () => {
  test("matches the limits the app ships with", async () => {
    test.skip(
      !HAS_DEPLOYMENT && !FORCED,
      `No deployment to measure: E2E_BASE_URL is ${TARGET || "unset"}. A local ` +
        `build has no platform wall in front of it, so this cannot prove ` +
        `anything there. Point E2E_BASE_URL at production to run it.`
    );
    // ~11 MB of probes, plus escalation/bisection if the wall has moved.
    test.setTimeout(600_000);

    const measurement = await measurePlatformWall({ baseUrl: TARGET });
    console.log(`[platform-wall] ${measurement.summary}`);
    for (const probe of measurement.probes) {
      console.log(
        `[platform-wall]   ${String(probe.status).padEnd(3)} ` +
          `${probe.bytes.toLocaleString("en-US").padStart(10)} B — ${probe.label}` +
          (probe.error ? ` (error: ${probe.error})` : "")
      );
    }

    expect(
      measurement.verdict.problems,
      `${measurement.summary}\n\n` +
        `If the host genuinely changed its ceiling, update ` +
        `PLATFORM_BODY_WALL_BYTES in src/lib/request-limits.ts (the guards and ` +
        `the UI copy are anchored to it).`
    ).toEqual([]);
    expect(measurement.verdict.ok).toBe(true);
  });
});
