"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCandidateDateKeys, parseDateKeyLocal } from "@/lib/date";
import type { EventWithParticipants } from "@/lib/types";

export function ResultsView({ event }: { event: EventWithParticipants }) {
  const total = event.participants.length;
  const [minCount, setMinCount] = useState(total > 0 ? "1" : "0");

  const rows = useMemo(() => {
    const dateKeys = getCandidateDateKeys(event);
    return dateKeys
      .map((key) => {
        const names = event.participants
          .filter((p) => p.availableDates.includes(key))
          .map((p) => p.name);
        return { key, count: names.length, names };
      })
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }, [event]);

  const filteredRows = rows.filter((r) => r.count >= Number(minCount));

  if (total === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        아직 아무도 응답하지 않았습니다. 링크를 공유해보세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">참여자 {total}명</p>
        <Select value={minCount} onValueChange={(value) => setMinCount(value ?? "0")}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">전체 날짜</SelectItem>
            {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n === total ? "전원 가능" : `${n}명 이상`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ul className="flex flex-col gap-2">
        {filteredRows.map((row) => (
          <li key={row.key} className="flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-medium">
                  {format(parseDateKeyLocal(row.key), "M월 d일 (EEE)", {
                    locale: ko,
                  })}
                </span>
                {event.gameInfo?.[row.key] && (
                  <span className="text-xs text-muted-foreground">
                    vs {event.gameInfo[row.key].opponent} (
                    {event.gameInfo[row.key].stadium}
                    {event.gameInfo[row.key].isHome ? "" : ", 원정"})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {row.count === total && (
                  <Badge>전원 가능</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {row.count}/{total}명
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(row.count / total) * 100}%` }}
              />
            </div>
            {row.names.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {row.names.map((n) => (
                  <Badge key={n} variant="secondary">
                    {n}
                  </Badge>
                ))}
              </div>
            )}
          </li>
        ))}
        {filteredRows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            조건에 맞는 날짜가 없습니다.
          </p>
        )}
      </ul>
    </div>
  );
}
