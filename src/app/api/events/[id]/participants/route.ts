import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { eventCacheTag } from "@/lib/events";
import { submitParticipantSchema } from "@/lib/validation";
import {
  formatDateKeyUTC,
  parseDateKeyUTC,
  isDeadlinePassed,
  getCandidateDateKeys,
} from "@/lib/date";
import {
  checkIpRateLimit,
  checkPinLock,
  clearPinFailures,
  getClientIp,
  recordPinFailure,
} from "@/lib/rate-limit";
import type { ParticipantData } from "@/lib/types";

function tooManyRequests(error: string, retryAfterSec: number) {
  return NextResponse.json(
    { error },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const ipLimit = await checkIpRateLimit(getClientIp(request));
  if (!ipLimit.ok) {
    return tooManyRequests(ipLimit.error, ipLimit.retryAfterSec);
  }

  const body = await request.json().catch(() => null);
  const parsed = submitParticipantSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다" },
      { status: 400 }
    );
  }

  const { name, pin, availableDates } = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { participants: true } } },
  });
  if (!event) {
    return NextResponse.json({ error: "이벤트를 찾을 수 없습니다" }, { status: 404 });
  }

  if (event.deadline && isDeadlinePassed(formatDateKeyUTC(event.deadline))) {
    return NextResponse.json({ error: "응답 마감기한이 지났습니다" }, { status: 403 });
  }

  const validDates = new Set(
    getCandidateDateKeys({
      startDate: formatDateKeyUTC(event.startDate),
      endDate: formatDateKeyUTC(event.endDate),
      candidateDates: event.candidateDates.map(formatDateKeyUTC),
    })
  );
  const outOfRange = availableDates.some((d) => !validDates.has(d));
  if (outOfRange) {
    return NextResponse.json(
      { error: "선택한 날짜가 후보 날짜 범위를 벗어났습니다" },
      { status: 400 }
    );
  }

  const dates = availableDates.map(parseDateKeyUTC);

  const existing = await prisma.participant.findUnique({
    where: { eventId_name: { eventId, name } },
  });

  // Max participants caps new joins only — someone already counted should
  // still be able to fix their own response after the group fills up.
  if (
    !existing &&
    event.maxParticipants != null &&
    event._count.participants >= event.maxParticipants
  ) {
    return NextResponse.json({ error: "정원이 다 찼습니다" }, { status: 403 });
  }

  let participant;
  if (existing) {
    const pinLock = await checkPinLock(eventId, name);
    if (!pinLock.ok) {
      return tooManyRequests(pinLock.error, pinLock.retryAfterSec);
    }

    const pinMatches = await bcrypt.compare(pin, existing.pinHash);
    if (!pinMatches) {
      const failure = await recordPinFailure(eventId, name);
      if (!failure.ok) {
        return tooManyRequests(failure.error, failure.retryAfterSec);
      }
      return NextResponse.json(
        { error: "이미 사용 중인 이름이며 PIN이 일치하지 않습니다" },
        { status: 409 }
      );
    }

    await clearPinFailures(eventId, name);
    participant = await prisma.participant.update({
      where: { id: existing.id },
      data: { availableDates: dates },
    });
  } else {
    // Cost 8, not the bcrypt default of 10: this PIN is a 4-digit
    // low-entropy "is this still you" check, not a real password, so it
    // doesn't need password-grade hashing cost — and that cost was showing
    // up directly as CPU contention in load testing (bcryptjs is pure JS,
    // no native thread-pool offload, so it blocks the event loop).
    const pinHash = await bcrypt.hash(pin, 8);
    participant = await prisma.participant.create({
      data: { eventId, name, pinHash, availableDates: dates },
    });
  }

  // { expire: 0 }, not the recommended profile: "max" — that gives
  // stale-while-revalidate semantics, which would serve ONE stale read to
  // whoever refreshes right after submitting (read-your-own-writes would
  // break). We're in a Route Handler, not a Server Action, so updateTag
  // (immediate, but Server-Action-only) isn't available here — expire: 0
  // is the documented Route Handler equivalent.
  revalidateTag(eventCacheTag(eventId), { expire: 0 });

  const responseBody: ParticipantData = {
    id: participant.id,
    name: participant.name,
    availableDates: participant.availableDates.map(formatDateKeyUTC),
  };

  return NextResponse.json(responseBody, { status: existing ? 200 : 201 });
}
