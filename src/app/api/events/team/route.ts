import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTeamEventSchema } from "@/lib/validation";
import { KBO_TEAMS } from "@/lib/kbo";
import { formatDateKeyUTC, parseDateKeyUTC } from "@/lib/date";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createTeamEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다" },
      { status: 400 }
    );
  }

  const { teamCode, scope } = parsed.data;
  const team = KBO_TEAMS.find((t) => t.code === teamCode)!;
  const today = parseDateKeyUTC(formatDateKeyUTC(new Date()));

  const games = await prisma.kboGame.findMany({
    where: {
      date: { gte: today },
      ...(scope === "home"
        ? { homeTeam: teamCode }
        : { OR: [{ homeTeam: teamCode }, { awayTeam: teamCode }] }),
    },
    orderBy: { date: "asc" },
  });

  if (games.length === 0) {
    return NextResponse.json(
      { error: "이번 시즌 남은 경기를 찾지 못했습니다" },
      { status: 400 }
    );
  }

  const candidateDates = games.map((g) => g.date);
  const gameInfo: Record<
    string,
    { opponent: string; stadium: string; isHome: boolean }
  > = {};
  for (const g of games) {
    const isHome = g.homeTeam === teamCode;
    gameInfo[formatDateKeyUTC(g.date)] = {
      opponent: KBO_TEAMS.find((t) => t.code === (isHome ? g.awayTeam : g.homeTeam))!
        .name,
      stadium: g.stadium,
      isHome,
    };
  }

  const event = await prisma.event.create({
    data: {
      title: scope === "home" ? `${team.name} 직관 일정` : `${team.name} 경기 일정`,
      description:
        scope === "home"
          ? "KBO 정규시즌 홈경기 일정으로 자동 생성된 약속이에요."
          : "KBO 정규시즌 홈+원정 경기 일정으로 자동 생성된 약속이에요.",
      startDate: candidateDates[0],
      endDate: candidateDates[candidateDates.length - 1],
      candidateDates,
      gameInfo,
    },
  });

  return NextResponse.json({ id: event.id }, { status: 201 });
}
