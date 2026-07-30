import { z } from "zod";
import { KBO_TEAMS } from "@/lib/kbo";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "yyyy-MM-dd 형식이어야 합니다");

export const createEventSchema = z
  .object({
    title: z.string().trim().min(1, "제목을 입력해주세요").max(100),
    description: z.string().trim().max(500).optional(),
    startDate: dateKey,
    endDate: dateKey,
    deadline: dateKey.optional(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "종료일은 시작일보다 빠를 수 없습니다",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      const start = new Date(`${data.startDate}T00:00:00.000Z`);
      const end = new Date(`${data.endDate}T00:00:00.000Z`);
      const days = (end.getTime() - start.getTime()) / 86400000;
      return days <= 180;
    },
    { message: "날짜 범위는 최대 180일까지 가능합니다", path: ["endDate"] }
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const submitParticipantSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요").max(30),
  pin: z.string().regex(/^\d{4}$/, "PIN은 숫자 4자리여야 합니다"),
  availableDates: z.array(dateKey).max(180),
});

export type SubmitParticipantInput = z.infer<typeof submitParticipantSchema>;

const teamCodes = KBO_TEAMS.map((t) => t.code) as [string, ...string[]];

export const createTeamEventSchema = z.object({
  teamCode: z.enum(teamCodes),
  scope: z.enum(["home", "all"]).default("home"),
});

export type CreateTeamEventInput = z.infer<typeof createTeamEventSchema>;
