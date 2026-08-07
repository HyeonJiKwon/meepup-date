"use client";

import { useState } from "react";
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
import { parseDateKeyLocal, isDeadlinePassed } from "@/lib/date";
import type { EventWithParticipants } from "@/lib/types";

export function EventView({
  event,
  url,
}: {
  event: EventWithParticipants;
  url: string;
}) {
  const rangeLabel = `${format(parseDateKeyLocal(event.startDate), "M월 d일", { locale: ko })} ~ ${format(parseDateKeyLocal(event.endDate), "M월 d일", { locale: ko })}`;
  const candidateCountLabel =
    event.candidateDates.length > 0 ? ` (총 ${event.candidateDates.length}일)` : "";

  const deadlinePassed = event.deadline ? isDeadlinePassed(event.deadline) : false;
  const isFull =
    event.maxParticipants != null &&
    event.participants.length >= event.maxParticipants;
  const defaultTab = deadlinePassed || isFull ? "results" : "input";
  const participantCountLabel = event.maxParticipants
    ? `${event.participants.length}/${event.maxParticipants}명`
    : `${event.participants.length}명`;

  // Tabs needs a controlled value: after a submission fills the event (via
  // router.refresh() re-rendering this with updated props), we want to jump
  // to the results tab, but an uncontrolled Tabs' defaultValue only applies
  // on first mount and warns if it changes afterward. Adjusting state during
  // render (not in an Effect) when a derived prop changes is the pattern
  // React recommends for this — see "Adjusting state when a prop changes".
  const [activeTab, setActiveTab] = useState<"input" | "results">(defaultTab);
  const [prevDefaultTab, setPrevDefaultTab] = useState(defaultTab);
  if (defaultTab !== prevDefaultTab) {
    setPrevDefaultTab(defaultTab);
    if (defaultTab === "results") setActiveTab("results");
  }

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
          {candidateCountLabel}
          {event.deadline &&
            ` · 마감: ${format(parseDateKeyLocal(event.deadline), "M월 d일", { locale: ko })}`}
          {event.maxParticipants && ` · 최대 인원: ${event.maxParticipants}명`}
          {isFull && " · 정원이 찼습니다"}
        </p>
        <ShareButton title={event.title} url={url} />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "input" | "results")}
      >
        <TabsList>
          <TabsTrigger value="input">내 일정 입력</TabsTrigger>
          <TabsTrigger value="results">
            결과 보기 ({participantCountLabel})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="input" className="pt-4">
          <AvailabilityForm
            event={event}
            onSubmitted={() => setActiveTab("results")}
          />
        </TabsContent>
        <TabsContent value="results" className="pt-4">
          <ResultsView event={event} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
