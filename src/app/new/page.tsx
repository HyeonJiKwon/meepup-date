"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateKeyLocal } from "@/lib/date";
import { KBO_TEAMS } from "@/lib/kbo";

const noopSubscribe = () => () => {};

// getSnapshot must return a stable reference across calls, or React treats
// every render as "changed" and re-renders forever. Compute once and cache.
let cachedToday: Date | undefined;
function getToday() {
  cachedToday ??= new Date();
  return cachedToday;
}

/**
 * `new Date()` differs between the SSR pass and client hydration, which would
 * otherwise mismatch the calendars' "before today" disabled state. Returning
 * `undefined` for the server snapshot keeps the first client render matching
 * SSR output; React re-renders with the real date right after hydration.
 */
function useToday(): Date | undefined {
  return useSyncExternalStore(noopSubscribe, getToday, () => undefined);
}

export default function NewEventPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"manual" | "team">("manual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [range, setRange] = useState<DateRange | undefined>();
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [teamSubmitting, setTeamSubmitting] = useState<string | null>(null);
  const [teamScope, setTeamScope] = useState<"home" | "all">("home");
  const today = useToday();

  async function handleTeamSelect(teamCode: string) {
    setTeamSubmitting(teamCode);
    try {
      const res = await fetch("/api/events/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamCode, scope: teamScope }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "약속을 만들지 못했습니다");
        return;
      }
      router.push(`/e/${data.id}`);
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setTeamSubmitting(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!range?.from || !range?.to) {
      toast.error("후보 날짜 범위를 선택해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          startDate: formatDateKeyLocal(range.from),
          endDate: formatDateKeyLocal(range.to),
          deadline: deadline ? formatDateKeyLocal(deadline) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "약속을 만들지 못했습니다");
        return;
      }
      router.push(`/e/${data.id}`);
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  const rangeLabel =
    range?.from && range?.to
      ? `${format(range.from, "M월 d일 (EEE)", { locale: ko })} ~ ${format(range.to, "M월 d일 (EEE)", { locale: ko })}`
      : range?.from
        ? `${format(range.from, "M월 d일 (EEE)", { locale: ko })} ~`
        : "날짜 범위 선택";

  const deadlineLabel = deadline
    ? format(deadline, "M월 d일 (EEE)", { locale: ko })
    : "마감일 선택";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>새 약속 만들기</CardTitle>
          <CardDescription>
            {mode === "manual"
              ? "후보 날짜 범위를 정하면 참여자들이 그 안에서 가능한 날짜를 골라요."
              : "응원팀을 고르면 그 팀 홈경기 날짜로 직관 약속이 자동으로 만들어져요."}
          </CardDescription>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "manual" ? "default" : "outline"}
              onClick={() => setMode("manual")}
            >
              직접 만들기
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "team" ? "default" : "outline"}
              onClick={() => setMode("team")}
            >
              KBO 직관 일정
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mode === "team" ? (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={teamScope === "home" ? "default" : "outline"}
                  onClick={() => setTeamScope("home")}
                >
                  홈경기만
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={teamScope === "all" ? "default" : "outline"}
                  onClick={() => setTeamScope("all")}
                >
                  전체 경기 (홈+원정)
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {KBO_TEAMS.map((team) => (
                  <Button
                    key={team.code}
                    type="button"
                    variant="outline"
                    className="justify-start gap-2"
                    disabled={teamSubmitting !== null}
                    onClick={() => handleTeamSelect(team.code)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={team.logo} alt="" className="size-5" />
                    {teamSubmitting === team.code ? "만드는 중..." : team.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                placeholder="예: 여름 휴가 일정 잡기"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">설명 (선택)</Label>
              <Textarea
                id="description"
                placeholder="약속에 대한 추가 설명을 적어주세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>후보 날짜 범위</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start font-normal"
                    />
                  }
                >
                  <CalendarIcon className="size-4" />
                  {rangeLabel}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    numberOfMonths={1}
                    disabled={today ? { before: today } : undefined}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-2">
              <Label>응답 마감기한 (선택)</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start font-normal"
                    />
                  }
                >
                  <CalendarIcon className="size-4" />
                  {deadlineLabel}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    numberOfMonths={1}
                    disabled={today ? { before: today } : undefined}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button type="submit" disabled={submitting} className="mt-2">
              {submitting ? "만드는 중..." : "만들기"}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
