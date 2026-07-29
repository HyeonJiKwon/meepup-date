"use client";

import { useState, type FormEvent } from "react";
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

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [range, setRange] = useState<DateRange | undefined>();
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [submitting, setSubmitting] = useState(false);

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
            후보 날짜 범위를 정하면 참여자들이 그 안에서 가능한 날짜를 골라요.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    disabled={{ before: new Date() }}
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
                    disabled={{ before: new Date() }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button type="submit" disabled={submitting} className="mt-2">
              {submitting ? "만드는 중..." : "만들기"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
