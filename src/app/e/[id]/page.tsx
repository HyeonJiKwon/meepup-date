import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getEventWithParticipants } from "@/lib/events";
import { EventView } from "@/components/event-view";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await getEventWithParticipants(id);
  if (!event) notFound();

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const url = `${protocol}://${host}/e/${id}`;

  return <EventView event={event} url={url} />;
}
