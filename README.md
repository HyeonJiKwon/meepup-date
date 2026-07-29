# meetup-date

여러 명이 가능한 날짜를 모아 겹치는 날짜를 자동으로 찾아주는 약속 조율 앱. Next.js + Prisma 7 + Supabase Postgres 기반. 로그인 없이 링크 공유만으로 참여할 수 있다.

## 주요 기능

- 방(이벤트) 생성: 제목, 설명, 후보 날짜 범위, 응답 마감기한(선택)
- 링크 공유: 복사 버튼 + Web Share API (모바일에서 카톡 등 공유 시트로 연결)
- 참가자 응답: 이름 + PIN(4자리)으로 로그인 없이 참여, 같은 이름+PIN으로 재방문 시 수정 가능
- 결과 보기: 날짜별 가능 인원수 정렬 목록, 전원 가능한 날짜 하이라이트, N명 이상 필터

## 개발 환경 실행

```bash
npm install
npm run dev
```

### 환경변수 (`.env`)

Supabase 프로젝트의 Dashboard > Project Settings > Database > Connection string에서 아래 두 값을 가져와 채워야 한다.

```
DATABASE_URL   # Transaction pooler 연결 문자열 (포트 6543) — 앱 런타임에서 사용
DIRECT_URL     # Direct connection 문자열 (포트 5432) — Prisma 마이그레이션에서 사용
```

### DB 마이그레이션

```bash
npx prisma migrate dev
```

## 기술 스택 메모

- **Prisma 7**: 드라이버 어댑터(`@prisma/adapter-pg`)가 필수이고, 연결 URL은 `schema.prisma`가 아니라 `prisma.config.ts`에 있다. 이 버전의 `@prisma/config`는 `directUrl`을 지원하지 않아서(7.6 이후 제거됨), CLI용 `prisma.config.ts`는 `DIRECT_URL`만 참조하고 앱 런타임(`src/lib/prisma.ts`)은 `DATABASE_URL`을 따로 사용한다.
- **shadcn/ui**가 Radix 대신 Base UI(`@base-ui/react`) 기반으로 되어 있어, 버튼을 링크처럼 쓰려면 `asChild` 대신 `render` prop을 쓴다 (`<Button render={<Link href="..." />} nativeButton={false}>`).
- 날짜는 `yyyy-MM-dd` 문자열로 클라이언트/서버 경계를 넘나든다. 클라이언트(react-day-picker)는 로컬 시간 기준, 서버(Prisma `@db.Date`)는 UTC 자정 기준으로 다루기 때문에 `src/lib/date.ts`의 로컬/UTC 헬퍼를 반드시 구분해서 써야 한다 (섞으면 timezone에 따라 하루씩 밀리는 버그가 생긴다).
