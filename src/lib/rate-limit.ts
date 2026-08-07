import { prisma } from "@/lib/prisma";

const IP_LIMIT = 20;
const IP_WINDOW_MS = 60_000;

const PIN_MAX_FAILURES = 5;
const PIN_LOCK_MS = 15 * 60_000;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; error: string; retryAfterSec: number };

function ipKey(ip: string) {
  return `ip:${ip}`;
}

function pinKey(eventId: string, name: string) {
  return `pin:${eventId}:${name}`;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function retryAfterSec(until: Date, now = new Date()) {
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 1000));
}

/**
 * Fixed-window IP rate limit for participant POST.
 *
 * This has to be ONE atomic statement, not read-then-decide-then-write.
 * Even with `{ increment: 1 }` on the write, a separate read first (to
 * decide "is the window expired?") leaves a gap where concurrent requests
 * all read the same stale windowStart and each independently reset the
 * counter — re-granting a fresh batch of requests every time. Measured:
 * this let 29 through a nominal 20/min cap under a 10-connection burst.
 * An `INSERT ... ON CONFLICT DO UPDATE` with the reset-vs-increment choice
 * inside the SQL itself closes that gap — Postgres serializes concurrent
 * upserts on the same row, so there's no window for two requests to both
 * see "expired" and both reset.
 */
export async function checkIpRateLimit(ip: string): Promise<RateLimitResult> {
  const id = ipKey(ip);
  const now = new Date();

  const [row] = await prisma.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "AuthThrottle" (id, count, "windowStart", "lockedUntil", "updatedAt")
    VALUES (${id}, 1, ${now}, NULL, ${now})
    ON CONFLICT (id) DO UPDATE SET
      count = CASE
        WHEN ${now}::timestamptz - "AuthThrottle"."windowStart" >= (${IP_WINDOW_MS} * interval '1 millisecond')
        THEN 1
        ELSE "AuthThrottle".count + 1
      END,
      "windowStart" = CASE
        WHEN ${now}::timestamptz - "AuthThrottle"."windowStart" >= (${IP_WINDOW_MS} * interval '1 millisecond')
        THEN ${now}::timestamptz
        ELSE "AuthThrottle"."windowStart"
      END,
      "updatedAt" = ${now}
    RETURNING count, "windowStart"
  `;

  if (row.count > IP_LIMIT) {
    const lockedUntil = new Date(row.windowStart.getTime() + IP_WINDOW_MS);
    return {
      ok: false,
      error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요",
      retryAfterSec: retryAfterSec(lockedUntil, now),
    };
  }

  return { ok: true };
}

/** Block PIN guesses while a name is locked after repeated failures. */
export async function checkPinLock(
  eventId: string,
  name: string
): Promise<RateLimitResult> {
  const id = pinKey(eventId, name);
  const now = new Date();
  const existing = await prisma.authThrottle.findUnique({ where: { id } });

  if (existing?.lockedUntil && existing.lockedUntil > now) {
    return {
      ok: false,
      error: "PIN 시도가 너무 많습니다. 잠시 후 다시 시도해주세요",
      retryAfterSec: retryAfterSec(existing.lockedUntil, now),
    };
  }

  return { ok: true };
}

export async function recordPinFailure(
  eventId: string,
  name: string
): Promise<RateLimitResult> {
  const id = pinKey(eventId, name);
  const now = new Date();

  // Same atomic-upsert shape as checkIpRateLimit, for the same reason: the
  // old code's "read existing, then decide reset-vs-increment, then write"
  // let concurrent guesses under the same name each see the same expired
  // lock and each independently reset the counter.
  const [row] = await prisma.$queryRaw<
    { count: number; lockedUntil: Date | null }[]
  >`
    INSERT INTO "AuthThrottle" (id, count, "windowStart", "lockedUntil", "updatedAt")
    VALUES (${id}, 1, ${now}, NULL, ${now})
    ON CONFLICT (id) DO UPDATE SET
      count = CASE
        WHEN "AuthThrottle"."lockedUntil" IS NOT NULL AND "AuthThrottle"."lockedUntil" <= ${now}
        THEN 1
        ELSE "AuthThrottle".count + 1
      END,
      "windowStart" = CASE
        WHEN "AuthThrottle"."lockedUntil" IS NOT NULL AND "AuthThrottle"."lockedUntil" <= ${now}
        THEN ${now}::timestamptz
        ELSE "AuthThrottle"."windowStart"
      END,
      "lockedUntil" = CASE
        WHEN "AuthThrottle"."lockedUntil" IS NOT NULL AND "AuthThrottle"."lockedUntil" <= ${now}
        THEN NULL
        ELSE "AuthThrottle"."lockedUntil"
      END,
      "updatedAt" = ${now}
    RETURNING count, "lockedUntil"
  `;

  if (row.lockedUntil && row.lockedUntil > now) {
    return {
      ok: false,
      error: "PIN 시도가 너무 많습니다. 잠시 후 다시 시도해주세요",
      retryAfterSec: retryAfterSec(row.lockedUntil, now),
    };
  }

  if (row.count >= PIN_MAX_FAILURES) {
    const lockedUntil = new Date(now.getTime() + PIN_LOCK_MS);
    await prisma.authThrottle.update({
      where: { id },
      data: { lockedUntil },
    });
    return {
      ok: false,
      error: "PIN 시도가 너무 많습니다. 15분 후 다시 시도해주세요",
      retryAfterSec: retryAfterSec(lockedUntil, now),
    };
  }

  return { ok: true };
}

export async function clearPinFailures(eventId: string, name: string) {
  const id = pinKey(eventId, name);
  await prisma.authThrottle.deleteMany({ where: { id } });
}
