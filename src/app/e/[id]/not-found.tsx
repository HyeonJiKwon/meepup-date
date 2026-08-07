import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarX2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <CalendarX2 className="size-8" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          좋은 약속이었나요?
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          이 약속은 찾을 수 없어요. 링크가 잘못됐거나, 끝난 지 14일이 지나
          자동으로 삭제됐어요.
        </p>
        <p className="max-w-md">
          좋은 사람들과 좋은 시간 보내셨길 바라며, 새로운 약속을 만들어볼까요?
        </p>
      </div>
      <Button size="lg" nativeButton={false} render={<Link href="/new" />}>
        새 약속 만들기
      </Button>
    </div>
  );
}
