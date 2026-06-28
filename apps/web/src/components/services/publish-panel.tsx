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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PublishStatus } from "@/lib/services/types";

const publishLabel: Record<PublishStatus, string> = {
  success: "已发布",
  pending: "等待生效",
  failed: "发布失败",
};

export function PublishPanel({
  serviceId,
  shortCode,
  platform,
  publishStatus,
  publishError,
  publishedAt,
  routingDomains,
}: {
  serviceId: string;
  shortCode: string;
  platform: string;
  publishStatus: PublishStatus;
  publishError: string;
  publishedAt: string;
  routingDomains: Array<{ domain: string; label: string; type: "public" | "customer" }>;
}) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [visibleLink, setVisibleLink] = useState("");

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

  async function copyVisitLink(domain: string) {
    const visitLink = `https://${domain}/v/${shortCode}`;
    setVisibleLink(visitLink);

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

        {visibleLink ? (
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">访问链接</div>
            <div className="mt-1 break-all font-mono text-sm">{visibleLink}</div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={publish} disabled={isPublishing}>
            <CloudUpload className="size-4" />
            {isPublishing ? "发布中" : "模拟发布"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline">
                <Copy className="size-4" />
                复制访问链接
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              {routingDomains.length ? (
                routingDomains.map((item) => (
                  <DropdownMenuItem key={item.domain} onClick={() => copyVisitLink(item.domain)}>
                    <Copy className="size-4" />
                    <div>
                      <div>{item.label || (item.type === "customer" ? "客户域名" : "公共域名")}</div>
                      <div className="text-xs text-muted-foreground">{item.domain}</div>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>请先在后台配置分流域名</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
