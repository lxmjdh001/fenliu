"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Copy, FileJson } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PublishStatus } from "@/lib/services/types";

const publishLabel: Record<PublishStatus, string> = {
  success: "已发布",
  pending: "等待生效",
  failed: "发布失败",
};

export function PublishPanel({
  serviceId,
  shortCode,
  domain,
  platform,
  publishStatus,
  publishError,
  publishedAt,
}: {
  serviceId: string;
  shortCode: string;
  domain: string;
  platform: string;
  publishStatus: PublishStatus;
  publishError: string;
  publishedAt: string;
}) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLinkVisible, setIsLinkVisible] = useState(false);
  const visitLink = `https://${domain}/v/${shortCode}`;

  async function publish() {
    setIsPublishing(true);

    try {
      const response = await fetch(`/api/services/${serviceId}/publish`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.message ?? "发布失败");
        return;
      }

      toast.success("模拟发布完成，KV 写入内容已生成。");
      router.refresh();
    } finally {
      setIsPublishing(false);
    }
  }

  async function copyVisitLink() {
    setIsLinkVisible(true);

    try {
      await navigator.clipboard.writeText(visitLink);
      toast.success("访问链接已复制。");
    } catch {
      toast.error("复制失败，请手动复制访问链接。");
    }
  }

  const variant =
    publishStatus === "success" ? "success" : publishStatus === "pending" ? "warning" : "destructive";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>发布状态</CardTitle>
            <CardDescription>当前先生成 KV 写入内容，下一步接入 Cloudflare API。</CardDescription>
          </div>
          <Badge variant={variant}>{publishLabel[publishStatus]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Route Key</div>
            <div className="mt-1 font-mono">route:{shortCode}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Service Key</div>
            <div className="mt-1 font-mono">service:{platform}:{shortCode}</div>
          </div>
        </div>

        {publishedAt ? (
          <p className="text-xs text-muted-foreground">
            最近发布：{new Date(publishedAt).toLocaleString("zh-CN")}
          </p>
        ) : null}
        {publishError ? <p className="text-xs text-destructive">{publishError}</p> : null}

        {isLinkVisible ? (
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">访问链接</div>
            <div className="mt-1 break-all font-mono text-sm">{visitLink}</div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={publish} disabled={isPublishing}>
            <CloudUpload className="size-4" />
            {isPublishing ? "发布中" : "模拟发布"}
          </Button>
          <Button type="button" variant="outline" onClick={copyVisitLink}>
            <Copy className="size-4" />
            复制访问链接
          </Button>
          <Button variant="outline" asChild>
            <a href={`/api/services/${serviceId}/snapshot`} target="_blank" rel="noreferrer">
              <FileJson className="size-4" />
              查看 Snapshot
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
