import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitParticipantSchema } from "@/lib/validation";
import {
  formatDateKeyUTC,
  parseDateKeyUTC,
  isDeadlinePassed,
  getCandidateDateKeys,
} from "@/lib/date";
import type { ParticipantData } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = submitParticipantSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다" },
      { status: 400 }
    );
  }

  const { name, pin, availableDates } = parsed.data;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
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

  let participant;
  if (existing) {
    const pinMatches = await bcrypt.compare(pin, existing.pinHash);
    if (!pinMatches) {
      return NextResponse.json(
        { error: "이미 사용 중인 이름이며 PIN이 일치하지 않습니다" },
        { status: 409 }
      );
    }
    participant = await prisma.participant.update({
      where: { id: existing.id },
      data: { availableDates: dates },
    });
  } else {
    const pinHash = await bcrypt.hash(pin, 10);
    participant = await prisma.participant.create({
      data: { eventId, name, pinHash, availableDates: dates },
    });
  }

  const responseBody: ParticipantData = {
    id: participant.id,
    name: participant.name,
    availableDates: participant.availableDates.map(formatDateKeyUTC),
  };

  return NextResponse.json(responseBody, { status: existing ? 200 : 201 });
}
