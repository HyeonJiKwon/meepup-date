import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatDateKeyUTC } from "@/lib/date";
import type { EventWithParticipants, GameInfo } from "@/lib/types";

export function eventCacheTag(id: string) {
  return `event-${id}`;
}

async function fetchEventWithParticipants(
  id: string
): Promise<EventWithParticipants | null> {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { participants: true },
  });

  if (!event) return null;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startDate: formatDateKeyUTC(event.startDate),
    endDate: formatDateKeyUTC(event.endDate),
    candidateDates: event.candidateDates.map(formatDateKeyUTC),
    gameInfo: event.gameInfo as Record<string, GameInfo> | null,
    deadline: event.deadline ? formatDateKeyUTC(event.deadline) : null,
    maxParticipants: event.maxParticipants,
    participants: event.participants.map((p) => ({
      id: p.id,
      name: p.name,
      availableDates: p.availableDates.map(formatDateKeyUTC),
    })),
  };
}

// Cross-request cache, not just React's per-request cache() below: many
// people opening the same shared link at once would otherwise all hit the
// DB for identical data (this is what made concurrent page loads the
// slowest part of load testing). Tagged per event and invalidated
// immediately on write (see the participants route), so there's no
// staleness window — this only coalesces concurrent reads, it doesn't
// serve outdated data.
//
// Note: on Vercel serverless this in-memory cache is per-instance, so
// concurrent requests routed to different instances won't share a hit the
// way they do in this single-process local dev server. It still helps
// (warm instances handle bursts of sequential requests), just not as much
// as this benchmark shows. Next 16 nominally prefers the `use cache`
// directive over this, but that requires opting the whole app into Cache
// Components (`cacheComponents: true`), a much bigger behavioral change —
// out of scope for this targeted fix.
// generateMetadata and the page component both need this; cache() dedupes
// the DB call across the two within a single request.
export const getEventWithParticipants = cache(function getEventWithParticipants(
  id: string
): Promise<EventWithParticipants | null> {
  return unstable_cache(() => fetchEventWithParticipants(id), [eventCacheTag(id)], {
    tags: [eventCacheTag(id)],
    revalidate: 30,
  })();
});
