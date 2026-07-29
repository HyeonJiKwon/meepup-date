import { NextResponse } from "next/server";
import { getEventWithParticipants } from "@/lib/events";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const event = await getEventWithParticipants(id);
  if (!event) {
    return NextResponse.json({ error: "이벤트를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json(event);
}
