"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("링크를 복사했어요");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했어요");
    }
  }

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch {
        // user closed the share sheet — no-op
      }
      return;
    }
    await copyLink();
  }

  return (
    <div className="flex gap-2">
      <Button type="button" onClick={handleShare} className="gap-2">
        <Share2 className="size-4" />
        공유하기
      </Button>
      <Button type="button" variant="outline" onClick={copyLink} className="gap-2">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        링크 복사
      </Button>
    </div>
  );
}
