/**
 * Date-only values cross the client/server boundary as "yyyy-MM-dd" strings.
 * On the client, react-day-picker gives back local-time Date objects, so we
 * must read/write them with local getters. On the server, Prisma's `@db.Date`
 * columns round-trip as UTC-midnight Date objects, so we must use UTC getters
 * there. Mixing the two causes an off-by-one-day bug depending on timezone.
 */

export function formatDateKeyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKeyLocal(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function parseDateKeyUTC(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function formatDateKeyUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Deadline is a calendar date; treat it as open through the end of that UTC day. */
export function isDeadlinePassed(deadlineKey: string): boolean {
  const endOfDeadlineDay = parseDateKeyUTC(deadlineKey).getTime() + 86400000;
  return Date.now() >= endOfDeadlineDay;
}

export function eachDateKeyInRangeUTC(startKey: string, endKey: string): string[] {
  const start = parseDateKeyUTC(startKey);
  const end = parseDateKeyUTC(endKey);
  const keys: string[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    keys.push(formatDateKeyUTC(new Date(t)));
  }
  return keys;
}
