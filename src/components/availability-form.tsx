"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatDateKeyLocal,
  parseDateKeyLocal,
  isDeadlinePassed,
  getCandidateDateKeys,
} from "@/lib/date";
import { useToday } from "@/lib/use-today";
import type { EventWithParticipants } from "@/lib/types";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function AvailabilityForm({ event }: { event: EventWithParticipants }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [selected, setSelected] = useState<Date[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const today = useToday();

  const startDate = useMemo(
    () => parseDateKeyLocal(event.startDate),
    [event.startDate]
  );
  const endDate = useMemo(
    () => parseDateKeyLocal(event.endDate),
    [event.endDate]
  );
  const deadlinePassed = event.deadline
    ? isDeadlinePassed(event.deadline)
    : false;
  const candidateKeys = useMemo(
    () => new Set(getCandidateDateKeys(event)),
    [event]
  );
  const datesByWeekday = useMemo(() => {
    const byDay: string[][] = [[], [], [], [], [], [], []];
    for (const key of candidateKeys) {
      byDay[parseDateKeyLocal(key).getDay()].push(key);
    }
    return byDay;
  }, [candidateKeys]);

  const selectedKeys = useMemo(
    () => new Set(selected.map(formatDateKeyLocal)),
    [selected]
  );

  function isWeekdayFullySelected(day: number) {
    const datesForDay = datesByWeekday[day];
    return (
      datesForDay.length > 0 &&
      datesForDay.every((key) => selectedKeys.has(key))
    );
  }

  const allSelected =
    candidateKeys.size > 0 &&
    [...candidateKeys].every((key) => selectedKeys.has(key));

  function toggleSelectAll() {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected([...candidateKeys].map(parseDateKeyLocal));
    }
  }

  function toggleWeekdayBulk(day: number) {
    const datesForDay = datesByWeekday[day];
    if (datesForDay.length === 0) return;

    const allSelected = datesForDay.every((key) => selectedKeys.has(key));

    if (allSelected) {
      const toRemove = new Set(datesForDay);
      setSelected((prev) =>
        prev.filter((d) => !toRemove.has(formatDateKeyLocal(d)))
      );
    } else {
      const toAdd = datesForDay
        .filter((key) => !selectedKeys.has(key))
        .map(parseDateKeyLocal);
      setSelected((prev) => [...prev, ...toAdd]);
    }
  }

  function loadExisting(nextName: string) {
    const existing = event.participants.find(
      (p) => p.name === nextName.trim()
    );
    if (existing) {
      setSelected(existing.availableDates.map(parseDateKeyLocal));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (selected.length === 0) {
      toast.error("가능한 날짜를 하나 이상 선택해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${event.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          pin,
          availableDates: selected.map(formatDateKeyLocal),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "제출하지 못했습니다");
        return;
      }
      toast.success("응답이 저장되었습니다");
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  if (deadlinePassed) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        응답 마감기한이 지나 더 이상 입력할 수 없습니다.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => loadExisting(e.target.value)}
            maxLength={30}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pin">PIN (숫자 4자리)</Label>
          <Input
            id="pin"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            required
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        같은 이름으로 다시 방문해 PIN을 입력하면 응답을 수정할 수 있어요.
      </p>

      <div className="flex flex-col gap-2">
        <Label>가능한 날짜 (여러 개 선택 가능)</Label>
        <p className="-mt-1 text-xs text-muted-foreground">
          날짜를 하나씩 눌러도 되고, 전체선택이나 요일 버튼을 누르면 여러
          날짜가 한 번에 선택/해제돼요.
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={allSelected ? "default" : "outline"}
            onClick={toggleSelectAll}
          >
            {allSelected ? "전체해제" : "전체선택"}
          </Button>
          {WEEKDAY_LABELS.map((label, day) => (
            <Button
              key={day}
              type="button"
              size="icon-sm"
              variant={isWeekdayFullySelected(day) ? "default" : "outline"}
              disabled={datesByWeekday[day].length === 0}
              onClick={() => toggleWeekdayBulk(day)}
            >
              {label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="multiple"
          selected={selected}
          onSelect={(dates) => setSelected(dates ?? [])}
          startMonth={startDate}
          endMonth={endDate}
          disabled={(date) => !candidateKeys.has(formatDateKeyLocal(date))}
          today={today}
          locale={ko}
          className="rounded-md border w-fit"
        />
        {event.gameInfo && (
          <ul className="mt-1 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border p-2 text-xs text-muted-foreground">
            {Object.entries(event.gameInfo)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, info]) => (
                <li key={key}>
                  {format(parseDateKeyLocal(key), "M/d (EEE)", { locale: ko })}{" "}
                  vs {info.opponent} ({info.stadium}
                  {info.isHome ? "" : ", 원정"})
                </li>
              ))}
          </ul>
        )}
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {submitting ? "저장 중..." : "제출하기"}
      </Button>
    </form>
  );
}
