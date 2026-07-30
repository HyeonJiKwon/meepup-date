const LOGO_BASE =
  "https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/2026/initial_";

export const KBO_TEAMS = [
  { code: "HH", name: "한화", logo: `${LOGO_BASE}HH.png` },
  { code: "LG", name: "LG", logo: `${LOGO_BASE}LG.png` },
  { code: "SK", name: "SSG", logo: `${LOGO_BASE}SK.png` },
  { code: "SS", name: "삼성", logo: `${LOGO_BASE}SS.png` },
  { code: "NC", name: "NC", logo: `${LOGO_BASE}NC.png` },
  { code: "KT", name: "KT", logo: `${LOGO_BASE}KT.png` },
  { code: "LT", name: "롯데", logo: `${LOGO_BASE}LT.png` },
  { code: "HT", name: "KIA", logo: `${LOGO_BASE}HT.png` },
  { code: "OB", name: "두산", logo: `${LOGO_BASE}OB.png` },
  { code: "WO", name: "키움", logo: `${LOGO_BASE}WO.png` },
] as const;

export type KboTeamCode = (typeof KBO_TEAMS)[number]["code"];

const SCHEDULE_URL = "https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList";

type ScheduleCell = { Text: string; Class: string | null };
type ScheduleRow = { row: ScheduleCell[] };
type SchedulePayload = { rows?: ScheduleRow[] };

export type KboGameInfo = {
  date: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
};

async function fetchMonthGames(
  year: number,
  month: string
): Promise<KboGameInfo[]> {
  const body = new URLSearchParams({
    leId: "1",
    srIdList: "0,9,6",
    seasonId: String(year),
    gameMonth: month,
    teamId: "",
  });

  const res = await fetch(SCHEDULE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://www.koreabaseball.com/Schedule/Schedule.aspx",
      "User-Agent": "Mozilla/5.0 (compatible; meetup-date-sync/1.0)",
    },
    body: body.toString(),
  });

  if (!res.ok) return [];

  const raw: unknown = await res.json();
  const payload: SchedulePayload =
    typeof (raw as { d?: unknown })?.d === "string"
      ? JSON.parse((raw as { d: string }).d)
      : ((raw as { d?: SchedulePayload })?.d ?? (raw as SchedulePayload));

  const nameToCode = new Map<string, string>(
    KBO_TEAMS.map((t) => [t.name, t.code])
  );
  const results: KboGameInfo[] = [];
  let currentDateKey: string | null = null;

  for (const { row } of payload.rows ?? []) {
    const dayCell = row.find((c) => c.Class === "day");
    if (dayCell) {
      const match = dayCell.Text.match(/^(\d{2})\.(\d{2})/);
      if (match) currentDateKey = `${year}-${match[1]}-${match[2]}`;
    }

    const playCell = row.find((c) => c.Class === "play");
    if (!playCell || !currentDateKey) continue;

    const spans = [...playCell.Text.matchAll(/<span[^>]*>([^<]*)<\/span>/g)].map(
      (m) => m[1]
    );
    if (spans.length < 2) continue;

    const awayName = spans[0];
    const homeName = spans[spans.length - 1];
    const homeTeam = nameToCode.get(homeName);
    const awayTeam = nameToCode.get(awayName);
    if (!homeTeam || !awayTeam) continue;

    // Stadium is always the second-to-last cell, regardless of whether this
    // row also carries the "day" cell (rowspan) or not.
    const stadium = row[row.length - 2]?.Text.trim();
    if (!stadium) continue;

    results.push({ date: currentDateKey, homeTeam, awayTeam, stadium });
  }

  return results;
}

/** Fetches the whole regular-season schedule (every game, home and away). */
export async function fetchSeasonGames(year: number): Promise<KboGameInfo[]> {
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const perMonth = await Promise.all(
    months.map((month) => fetchMonthGames(year, month).catch(() => []))
  );
  return perMonth.flat();
}
