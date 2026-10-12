/**
 * Upload pipeline tests (Node, engine-independent — see the `node` project).
 *
 * These cover the client half of the signed-URL upload path end to end against
 * a local fake storage endpoint: what leaves the browser, what it does when
 * storage says no, and what happens when nothing answers at all. That last case
 * is the one the bug report was about — an upload that never returns used to
 * leave the editor saying "Uploading…" forever with no error and no way back.
 *
 * The server half (minting the signed URL, authorization, the folder/kind
 * whitelist) is exercised by `upload-sign-actions.ts` and is covered
 * structurally here through the shared whitelist and validators; it cannot be
 * driven over HTTP without admin credentials, which this environment does not
 * have.
 */

import { test, expect } from "@playwright/test";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { uploadAdminFile } from "../src/lib/upload-client";
import {
  IMAGE_MAX_BYTES,
  imageSizeError,
  imageTypeError,
  pdfSizeError,
  pdfTypeError,
} from "../src/lib/upload-limits";
import { allowedKindsFor } from "../src/lib/upload-folders";

// ── Fake Supabase Storage ────────────────────────────────────────────────────

type Recorded = {
  method: string;
  path: string;
  bytes: number;
  upsert: string | null;
};

type FakeOptions = {
  /** Status codes returned by successive PUTs (last one repeats). */
  putStatuses?: number[];
  /** Stall every PUT for this long before answering (Infinity = never). */
  stallMs?: number;
  /** Status returned by the public-URL HEAD verification. */
  headStatus?: number;
  /** Return Supabase's "Duplicate" body (HTTP 400, statusCode 409). */
  duplicateBody?: boolean;
};

type Fake = {
  base: string;
  requests: Recorded[];
  putCount: () => number;
  headCount: () => number;
  close: () => Promise<void>;
};

async function startFakeStorage(options: FakeOptions = {}): Promise<Fake> {
  const requests: Recorded[] = [];
  let puts = 0;
  let heads = 0;

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    let bytes = 0;
    req.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
    });
    req.on("end", () => {
      if (req.method === "HEAD") {
        heads += 1;
        res.writeHead(options.headStatus ?? 200);
        res.end();
        return;
      }
      if (req.method !== "PUT") {
        res.writeHead(405).end();
        return;
      }

      requests.push({
        method: "PUT",
        path: url.pathname,
        bytes,
        upsert: (req.headers["x-upsert"] as string) ?? null,
      });
      const index = puts++;
      const status =
        options.putStatuses?.[
          Math.min(index, (options.putStatuses?.length ?? 1) - 1)
        ] ?? 200;

      const respond = () => {
        if (status === 200) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ Key: url.pathname }));
          return;
        }
        if (options.duplicateBody) {
          res.writeHead(status, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              statusCode: "409",
              error: "Duplicate",
              message: "The resource already exists",
            })
          );
          return;
        }
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify({ statusCode: String(status), message: "nope" }));
      };

      const stall = options.stallMs;
      if (stall === undefined) {
        respond();
        return;
      }
      if (stall === Infinity) return; // never answer — stands in for a stalled link
      setTimeout(respond, stall);
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    base: `http://127.0.0.1:${port}`,
    requests,
    putCount: () => puts,
    headCount: () => heads,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

function signerFor(fake: Fake) {
  return async (request: { folder: string; name: string }) => {
    const path = `${request.folder}/test-${Math.random().toString(36).slice(2, 8)}.jpg`;
    return {
      path,
      token: "test-token",
      signedUrl: `${fake.base}/storage/v1/object/upload/sign/article-images/${path}?token=test-token`,
      publicUrl: `${fake.base}/object/public/article-images/${path}`,
      error: null,
    };
  };
}

function imageFile(sizeBytes: number, name = "photo.jpg"): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: "image/jpeg" });
}

// ── Shared guards ────────────────────────────────────────────────────────────

test.describe("upload guards", () => {
  test("rejects an oversized image with the enforced limit, before sending", () => {
    const message = imageSizeError({ size: IMAGE_MAX_BYTES + 1 });
    expect(message).toContain("5MB");
    expect(message).toMatch(/smaller/);
  });

  test("accepts an image exactly at the limit", () => {
    expect(imageSizeError({ size: IMAGE_MAX_BYTES })).toBeNull();
  });

  test("rejects a non-image type", () => {
    expect(imageTypeError({ type: "application/pdf" })).toContain("JPEG");
    expect(imageTypeError({ type: "image/webp" })).toBeNull();
  });

  test("pdf guards mirror the server-side rejection", () => {
    expect(pdfTypeError({ type: "image/png" })).toBe("File must be a PDF.");
    expect(pdfSizeError({ size: 31 * 1024 * 1024 })).toMatch(/30 MB/);
    expect(pdfTypeError({ type: "application/pdf" })).toBeNull();
  });

  test("the folder whitelist only allows the kinds a section handles", () => {
    expect(allowedKindsFor("articles")).toEqual(["image"]);
    expect(allowedKindsFor("archive")).toContain("pdf");
    expect(allowedKindsFor("issues")).toContain("pdf");
    expect(allowedKindsFor("highlights")).not.toContain("pdf");
  });

  test("the folder whitelist rejects anything outside it", () => {
    expect(allowedKindsFor("../secrets")).toBeNull();
    expect(allowedKindsFor("constructor")).toBeNull();
    expect(allowedKindsFor("")).toBeNull();
  });
});

// ── Happy path ───────────────────────────────────────────────────────────────

test.describe("successful upload", () => {
  let fake: Fake;
  test.beforeEach(async () => {
    fake = await startFakeStorage();
  });
  test.afterEach(async () => {
    await fake.close();
  });

  test("sends the bytes to storage (not to the app) and verifies the result", async () => {
    const file = imageFile(2 * 1024 * 1024);
    const result = await uploadAdminFile(file, {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
    });

    expect(result.error).toBeNull();
    expect(result.url).toContain("/object/public/article-images/");
    expect(fake.putCount()).toBe(1);
    expect(fake.requests[0].path).toContain("/storage/v1/object/upload/sign/");
    expect(fake.requests[0].upsert).toBe("false");
    // The multipart body carries the whole file (plus the small wrapper).
    expect(fake.requests[0].bytes).toBeGreaterThan(file.size);
    // Success is only reported after the object was actually readable.
    expect(fake.headCount()).toBeGreaterThan(0);
  });

  test("a 4.6 MB image — which a Vercel function request body rejects — succeeds", async () => {
    const file = imageFile(4.6 * 1024 * 1024);
    const result = await uploadAdminFile(file, {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
    });
    expect(result.error).toBeNull();
    expect(fake.putCount()).toBe(1);
  });
});

// ── Rejections that must not be retried ──────────────────────────────────────

test.describe("permanent failures", () => {
  let fake: Fake;
  test.afterEach(async () => {
    await fake.close();
  });

  test("an oversized file never leaves the browser", async () => {
    fake = await startFakeStorage();
    const result = await uploadAdminFile(imageFile(IMAGE_MAX_BYTES + 1024), {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
    });
    expect(result.stage).toBe("validate");
    expect(result.retryable).toBe(false);
    expect(fake.putCount()).toBe(0);
  });

  test("an unsupported type never leaves the browser", async () => {
    fake = await startFakeStorage();
    const file = new File([new Uint8Array(10)], "clip.mp4", { type: "video/mp4" });
    const result = await uploadAdminFile(file, {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
    });
    expect(result.stage).toBe("validate");
    expect(fake.putCount()).toBe(0);
  });

  test("a rejected sign request is not retried", async () => {
    fake = await startFakeStorage();
    const result = await uploadAdminFile(imageFile(1024), {
      kind: "image",
      folder: "articles",
      sign: async () => ({
        path: null,
        token: null,
        signedUrl: null,
        publicUrl: null,
        error: "That file is larger than the storage limit.",
      }),
    });
    expect(result.stage).toBe("sign");
    expect(result.retryable).toBe(false);
    expect(result.error).toContain("larger than");
    expect(fake.putCount()).toBe(0);
  });

  test("a 401 is reported as an expired session, without retrying", async () => {
    fake = await startFakeStorage({ putStatuses: [401] });
    const result = await uploadAdminFile(imageFile(1024), {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
    });
    expect(result.retryable).toBe(false);
    expect(result.error).toMatch(/session has expired/i);
    expect(fake.putCount()).toBe(1);
  });

  test("a 413 is reported as too large, without retrying", async () => {
    fake = await startFakeStorage({ putStatuses: [413] });
    const result = await uploadAdminFile(imageFile(1024), {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
    });
    expect(result.retryable).toBe(false);
    expect(result.error).toMatch(/larger than the storage limit/i);
    expect(fake.putCount()).toBe(1);
  });
});

// ── Retries ──────────────────────────────────────────────────────────────────

test.describe("bounded retry", () => {
  let fake: Fake;
  test.afterEach(async () => {
    await fake.close();
  });

  test("retries once after a 500 and then succeeds — same object path, no duplicate", async () => {
    fake = await startFakeStorage({ putStatuses: [500, 200] });
    const result = await uploadAdminFile(imageFile(64 * 1024), {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
    });

    expect(result.error).toBeNull();
    expect(fake.putCount()).toBe(2);
    // Every attempt targets the identical storage path, so a retry can never
    // create a second media object.
    expect(fake.requests[0].path).toBe(fake.requests[1].path);
  });

  test("stops after one retry and reports a retryable storage failure", async () => {
    fake = await startFakeStorage({ putStatuses: [500] });
    const result = await uploadAdminFile(imageFile(64 * 1024), {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
    });
    expect(result.error).toMatch(/temporarily unavailable/i);
    expect(result.retryable).toBe(true);
    expect(fake.putCount()).toBe(2); // one attempt + exactly one retry
  });

  test("a retry that finds the object already there is a success", async () => {
    // First attempt fails fast, second returns Supabase's Duplicate body — the
    // bytes are in storage, so the outcome must not be "failed".
    fake = await startFakeStorage({
      putStatuses: [500, 400],
      duplicateBody: true,
    });
    const result = await uploadAdminFile(imageFile(64 * 1024), {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
    });
    expect(result.error).toBeNull();
    expect(result.url).toContain("/object/public/");
    expect(fake.putCount()).toBe(2);
  });
});

// ── Timeouts and cancellation ────────────────────────────────────────────────

test.describe("no indefinite state", () => {
  test("a stalled transfer times out, is NOT retried automatically, and reports it", async () => {
    const fake = await startFakeStorage({ stallMs: Infinity });
    const startedAt = Date.now();
    const result = await uploadAdminFile(imageFile(3 * 1024 * 1024), {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
      timeoutMs: 700,
    });
    const elapsed = Date.now() - startedAt;

    expect(result.error).toMatch(/timed out/i);
    expect(result.retryable).toBe(true);
    expect(elapsed).toBeLessThan(4000);
    // Exactly one attempt: on a slow link a blind automatic retry would double
    // the bytes sent and probably stall again.
    expect(fake.putCount()).toBe(1);
    await fake.close();
  });

  test("an aborted upload reports cancellation, not failure", async () => {
    const fake = await startFakeStorage({ stallMs: Infinity });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 150);
    const result = await uploadAdminFile(imageFile(1024), {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
      signal: controller.signal,
      timeoutMs: 5000,
    });

    expect(result.cancelled).toBe(true);
    expect(result.error).toBeNull();
    expect(fake.headCount()).toBe(0);
    await fake.close();
  });

  test("an upload aborted before it starts never reaches storage", async () => {
    const fake = await startFakeStorage();
    const controller = new AbortController();
    controller.abort();
    const result = await uploadAdminFile(imageFile(1024), {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
      signal: controller.signal,
    });
    expect(result.cancelled).toBe(true);
    await fake.close();
  });
});

// ── Verification ─────────────────────────────────────────────────────────────

test.describe("success means the file is really readable", () => {
  test("an uploaded-but-unreadable object is reported as a retryable failure", async () => {
    const fake = await startFakeStorage({ headStatus: 404 });
    const result = await uploadAdminFile(imageFile(2048), {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
      timeoutMs: 3000,
    });
    expect(result.stage).toBe("verify");
    expect(result.error).toMatch(/not readable/i);
    expect(result.retryable).toBe(true);
    await fake.close();
  });

  test("the public-read check is skipped when verification is disabled", async () => {
    const fake = await startFakeStorage({ headStatus: 404 });
    const result = await uploadAdminFile(imageFile(2048), {
      kind: "image",
      folder: "articles",
      sign: signerFor(fake),
      verify: false,
    });
    expect(result.error).toBeNull();
    expect(fake.headCount()).toBe(0);
    await fake.close();
  });
});

// ── PDFs ─────────────────────────────────────────────────────────────────────

test("a 12 MB PDF uploads directly to storage", async () => {
  const fake = await startFakeStorage();
  const file = new File([new Uint8Array(12 * 1024 * 1024)], "issue.pdf", {
    type: "application/pdf",
  });
  const result = await uploadAdminFile(file, {
    kind: "pdf",
    folder: "archive",
    sign: signerFor(fake),
  });
  expect(result.error).toBeNull();
  expect(fake.putCount()).toBe(1);
  await fake.close();
});
