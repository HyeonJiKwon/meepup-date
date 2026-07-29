import { prisma } from "@/lib/prisma";
import { formatDateKeyUTC } from "@/lib/date";
import type { EventWithParticipants } from "@/lib/types";

export async function getEventWithParticipants(
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
    deadline: event.deadline ? formatDateKeyUTC(event.deadline) : null,
    participants: event.participants.map((p) => ({
      id: p.id,
      name: p.name,
      availableDates: p.availableDates.map(formatDateKeyUTC),
    })),
  };
}
