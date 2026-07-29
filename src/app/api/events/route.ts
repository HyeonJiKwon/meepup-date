import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEventSchema } from "@/lib/validation";
import { parseDateKeyUTC } from "@/lib/date";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다" },
      { status: 400 }
    );
  }

  const { title, description, startDate, endDate, deadline } = parsed.data;

  const event = await prisma.event.create({
    data: {
      title,
      description: description || null,
      startDate: parseDateKeyUTC(startDate),
      endDate: parseDateKeyUTC(endDate),
      deadline: deadline ? parseDateKeyUTC(deadline) : null,
    },
  });

  return NextResponse.json({ id: event.id }, { status: 201 });
}
