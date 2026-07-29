import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { AvailabilityForm } from "@/components/availability-form";
import { ResultsView } from "@/components/results-view";
import { ShareButton } from "@/components/share-button";
import { parseDateKeyLocal } from "@/lib/date";
import type { EventWithParticipants } from "@/lib/types";

export function EventView({
  event,
  url,
}: {
  event: EventWithParticipants;
  url: string;
}) {
  const rangeLabel = `${format(parseDateKeyLocal(event.startDate), "M월 d일", { locale: ko })} ~ ${format(parseDateKeyLocal(event.endDate), "M월 d일", { locale: ko })}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        {event.description && (
          <p className="whitespace-pre-line text-muted-foreground">
            {event.description}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          후보 날짜: {rangeLabel}
          {event.deadline &&
            ` · 마감: ${format(parseDateKeyLocal(event.deadline), "M월 d일", { locale: ko })}`}
        </p>
        <ShareButton title={event.title} url={url} />
      </div>

      <Tabs defaultValue="input">
        <TabsList>
          <TabsTrigger value="input">내 일정 입력</TabsTrigger>
          <TabsTrigger value="results">
            결과 보기 ({event.participants.length}명)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="input" className="pt-4">
          <AvailabilityForm event={event} />
        </TabsContent>
        <TabsContent value="results" className="pt-4">
          <ResultsView event={event} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
