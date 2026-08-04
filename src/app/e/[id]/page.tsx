import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { getEventWithParticipants } from "@/lib/events";
import { parseDateKeyLocal } from "@/lib/date";
import { EventView } from "@/components/event-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventWithParticipants(id);

  if (!event) {
    return { title: "약속을 찾을 수 없어요" };
  }

  const rangeLabel = `${format(parseDateKeyLocal(event.startDate), "M월 d일", { locale: ko })} ~ ${format(parseDateKeyLocal(event.endDate), "M월 d일", { locale: ko })}`;
  const deadlineLabel = event.deadline
    ? format(parseDateKeyLocal(event.deadline), "M월 d일", { locale: ko })
    : null;

  const description = [
    event.description,
    `후보 날짜: ${rangeLabel}`,
    deadlineLabel ? `마감: ${deadlineLabel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: event.title,
      description,
    },
  };
}

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
