import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PublishPanel } from "@/components/services/publish-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listRoutingDomains } from "@/lib/domains/store";
import { accessRuleLabels, platformLabels, whatsAppEntryLabels } from "@/lib/mock-data";
import { getService, toServiceRow } from "@/lib/services/store";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const record = await getService(id, user);
  const routingDomains = await listRoutingDomains({ enabledOnly: true });

  if (!record) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild className="-ml-3">
          <Link href="/services">
            <ArrowLeft className="size-4" />
            返回服务列表
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>服务不存在</CardTitle>
            <CardDescription>请返回服务列表重新选择。</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const service = toServiceRow(record);

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="-ml-3">
        <Link href="/services">
          <ArrowLeft className="size-4" />
          返回服务列表
        </Link>
      </Button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{service.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">短码：/{service.shortCode}</p>
        </div>
        <Badge variant="success">已发布</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>今日 PV</CardTitle>
            <CardDescription>正常跳转访问</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{service.todayPv.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>今日 UV</CardTitle>
            <CardDescription>按 IP hash 去重</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{service.todayUv.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>目标账号</CardTitle>
            <CardDescription>启用中的客服账号</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{service.targets}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>服务配置</CardTitle>
            <CardDescription>Worker 会读取这些配置生成跳转结果。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Info label="平台" value={platformLabels[record.platform]} />
            <Info label="分流规则" value={accessRuleLabels[record.accessRule]} />
            {record.platform === "whatsapp" ? (
              <Info label="WhatsApp 入口" value={whatsAppEntryLabels[record.whatsappEntry]} />
            ) : null}
            <Info label="IP 锁定" value={record.lockIP ? "开启" : "关闭"} />
            <Info label="短码" value={record.shortCode} />
            <Info label="会员到期" value={new Date(record.membershipExpiresAt).toLocaleString("zh-CN")} />
            {record.platform === "whatsapp" ? (
              <Info label="问候语" value={record.globalGreeting || "未设置"} />
            ) : null}
          </CardContent>
        </Card>

        <PublishPanel
          serviceId={record.id}
          shortCode={record.shortCode}
          platform={record.platform}
          publishStatus={record.publishStatus}
          publishError={record.publishError}
          publishedAt={record.publishedAt}
          routingDomains={routingDomains}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>目标账号</CardTitle>
          <CardDescription>保存时已经按平台规则规范化并自动去重。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {record.targets.map((target) => (
            <div
              key={target.id}
              className="grid gap-3 rounded-lg border p-3 text-sm md:grid-cols-[160px_1fr_120px]"
            >
              <div>
                <div className="font-medium">{target.remark}</div>
                <div className="mt-1 text-xs text-muted-foreground">{target.targetKey}</div>
              </div>
              <div>
                <div className="font-mono text-xs text-muted-foreground">原始：{target.url}</div>
                <div className="mt-1 font-mono">规范化：{target.normalizedUrl}</div>
              </div>
              <div className="flex items-center md:justify-end">
                <Badge variant={target.enabled ? "success" : "warning"}>
                  {target.enabled ? "启用" : "禁用"}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
