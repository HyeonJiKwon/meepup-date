import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { formatDateKeyUTC } from "@/lib/date";
import type { EventWithParticipants, GameInfo } from "@/lib/types";

// generateMetadata and the page component both need this; cache() dedupes
// the DB call across the two within a single request.
export const getEventWithParticipants = cache(async function getEventWithParticipants(
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
    participants: event.participants.map((p) => ({
      id: p.id,
      name: p.name,
      availableDates: p.availableDates.map(formatDateKeyUTC),
    })),
  };
});
