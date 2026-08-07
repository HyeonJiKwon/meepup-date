"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { format, eachDayOfInterval } from "date-fns";
import { ko } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { CalendarIcon, Loader2 } from "lucide-react";

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
import { useToday } from "@/lib/use-today";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const ALL_WEEKDAYS = new Set([0, 1, 2, 3, 4, 5, 6]);
const WEEKDAYS = new Set([1, 2, 3, 4, 5]);
const WEEKEND = new Set([0, 6]);

export default function NewEventPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"manual" | "team">("manual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [range, setRange] = useState<DateRange | undefined>();
  const [weekdays, setWeekdays] = useState<Set<number>>(ALL_WEEKDAYS);
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [maxParticipants, setMaxParticipants] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [teamSubmitting, setTeamSubmitting] = useState<string | null>(null);
  const [teamScope, setTeamScope] = useState<"home" | "all">("home");
  const today = useToday();
  // Plain state alone leaves a gap between a click and the disabled prop
  // actually committing to the DOM — a fast double-click/tap can land a
  // second call inside that gap. Refs update synchronously, so checking
  // one here closes the gap regardless of render timing.
  const submitGuardRef = useRef(false);
  const teamSubmitGuardRef = useRef(false);

  async function handleTeamSelect(teamCode: string) {
    if (teamSubmitGuardRef.current) return;
    teamSubmitGuardRef.current = true;
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
        teamSubmitGuardRef.current = false;
        setTeamSubmitting(null);
        return;
      }
      // Don't reset the guard here: router.push() kicks off navigation but
      // doesn't wait for it, so resetting immediately re-enables the button
      // while the new route is still loading — exactly the window that let
      // repeated clicks create multiple events. Stay locked until this
      // component unmounts on navigation.
      router.push(`/e/${data.id}`);
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
      teamSubmitGuardRef.current = false;
      setTeamSubmitting(null);
    }
  }

  function toggleWeekday(day: number) {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitGuardRef.current) return;

    if (!range?.from || !range?.to) {
      toast.error("후보 날짜 범위를 선택해주세요");
      return;
    }

    let candidateDates: string[] | undefined;
    if (weekdays.size < 7) {
      candidateDates = eachDayOfInterval({ start: range.from, end: range.to })
        .filter((d) => weekdays.has(d.getDay()))
        .map(formatDateKeyLocal);
      if (candidateDates.length === 0) {
        toast.error("선택한 요일에 해당하는 날짜가 없습니다");
        return;
      }
    }

    submitGuardRef.current = true;
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
          candidateDates,
          deadline: deadline ? formatDateKeyLocal(deadline) : undefined,
          maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "약속을 만들지 못했습니다");
        submitGuardRef.current = false;
        setSubmitting(false);
        return;
      }
      // Don't reset the guard here — see the same comment in
      // handleTeamSelect. Stay locked until this component unmounts.
      router.push(`/e/${data.id}`);
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
      submitGuardRef.current = false;
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
              ? "후보 날짜 범위를 정하면 참여자들이 그 안에서 가능한 날짜를 골라요. 범위 안에서 특정 요일만 후보로 남기고 싶다면 아래 요일 필터를 써보세요."
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
              <p className="text-xs text-muted-foreground">
                후보 날짜 범위가 끝난 지 14일이 지나면 이 약속 데이터(응답 포함)는
                자동으로 삭제돼요.
              </p>
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
                    {teamSubmitting === team.code ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.logo} alt="" className="size-5" />
                    )}
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
                    today={today}
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-2">
              <Label>요일 필터 (선택)</Label>
              <p className="-mt-1 text-xs text-muted-foreground">
                선택한 요일에 해당하는 날짜만 후보로 남아요. 기본은 범위 안
                모든 날짜예요.
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setWeekdays(ALL_WEEKDAYS)}
                >
                  전체
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setWeekdays(WEEKDAYS)}
                >
                  주중만
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setWeekdays(WEEKEND)}
                >
                  주말만
                </Button>
              </div>
              <div className="flex gap-1">
                {WEEKDAY_LABELS.map((label, day) => (
                  <Button
                    key={day}
                    type="button"
                    size="icon-sm"
                    variant={weekdays.has(day) ? "default" : "outline"}
                    onClick={() => toggleWeekday(day)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
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
                    today={today}
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="maxParticipants">최대 인원 (선택)</Label>
              <Input
                id="maxParticipants"
                type="number"
                inputMode="numeric"
                min={1}
                max={1000}
                placeholder="예: 5"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
              />
              <p className="-mt-1 text-xs text-muted-foreground">
                정하면 마감일 전이라도 인원이 다 차면 결과 보기 탭이 기본으로
                보여요.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              후보 날짜 범위가 끝난 지 14일이 지나면 이 약속 데이터(응답 포함)는
              자동으로 삭제돼요.
            </p>

            <Button type="submit" disabled={submitting} className="mt-2">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "만드는 중..." : "만들기"}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
