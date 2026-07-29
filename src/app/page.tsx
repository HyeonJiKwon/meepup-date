import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarCheck2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <CalendarCheck2 className="size-8" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          다 같이 되는 날짜, 한번에 찾기
        </h1>
        <p className="max-w-md text-muted-foreground">
          약속 후보 날짜를 만들고 링크를 공유하세요. 참여자들이 가능한 날짜를
          입력하면 모두가 겹치는 날짜를 자동으로 알려드려요.
        </p>
      </div>
      <Button size="lg" nativeButton={false} render={<Link href="/new" />}>
        새 약속 만들기
      </Button>
    </div>
  );
}
