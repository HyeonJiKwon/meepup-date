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

/** Fixed-window IP rate limit for participant POST. */
export async function checkIpRateLimit(ip: string): Promise<RateLimitResult> {
  const id = ipKey(ip);
  const now = new Date();

  const existing = await prisma.authThrottle.findUnique({ where: { id } });

  if (existing?.lockedUntil && existing.lockedUntil > now) {
    return {
      ok: false,
      error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요",
      retryAfterSec: retryAfterSec(existing.lockedUntil, now),
    };
  }

  if (!existing || now.getTime() - existing.windowStart.getTime() >= IP_WINDOW_MS) {
    await prisma.authThrottle.upsert({
      where: { id },
      create: { id, count: 1, windowStart: now, lockedUntil: null },
      update: { count: 1, windowStart: now, lockedUntil: null },
    });
    return { ok: true };
  }

  const nextCount = existing.count + 1;
  if (nextCount > IP_LIMIT) {
    const lockedUntil = new Date(existing.windowStart.getTime() + IP_WINDOW_MS);
    await prisma.authThrottle.update({
      where: { id },
      data: { count: nextCount, lockedUntil },
    });
    return {
      ok: false,
      error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요",
      retryAfterSec: retryAfterSec(lockedUntil, now),
    };
  }

  await prisma.authThrottle.update({
    where: { id },
    data: { count: nextCount },
  });
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
  const existing = await prisma.authThrottle.findUnique({ where: { id } });

  if (existing?.lockedUntil && existing.lockedUntil > now) {
    return {
      ok: false,
      error: "PIN 시도가 너무 많습니다. 잠시 후 다시 시도해주세요",
      retryAfterSec: retryAfterSec(existing.lockedUntil, now),
    };
  }

  // New window if unlocked after a previous lock expired
  const resetWindow =
    !existing ||
    (existing.lockedUntil != null && existing.lockedUntil <= now);

  const nextCount = resetWindow ? 1 : existing.count + 1;

  if (nextCount >= PIN_MAX_FAILURES) {
    const lockedUntil = new Date(now.getTime() + PIN_LOCK_MS);
    await prisma.authThrottle.upsert({
      where: { id },
      create: { id, count: nextCount, windowStart: now, lockedUntil },
      update: { count: nextCount, lockedUntil },
    });
    return {
      ok: false,
      error: "PIN 시도가 너무 많습니다. 15분 후 다시 시도해주세요",
      retryAfterSec: retryAfterSec(lockedUntil, now),
    };
  }

  await prisma.authThrottle.upsert({
    where: { id },
    create: { id, count: nextCount, windowStart: now, lockedUntil: null },
    update: {
      count: nextCount,
      ...(resetWindow ? { windowStart: now, lockedUntil: null } : {}),
    },
  });

  return { ok: true };
}

export async function clearPinFailures(eventId: string, name: string) {
  const id = pinKey(eventId, name);
  await prisma.authThrottle.deleteMany({ where: { id } });
}
