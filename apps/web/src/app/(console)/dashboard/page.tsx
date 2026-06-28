import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Globe2,
  Link2,
  RadioTower,
  ShieldCheck,
  Users,
} from "lucide-react";

import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { ServicesTable } from "@/components/services/services-table";
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
import { listServiceRows } from "@/lib/services/store";

export const dynamic = "force-dynamic";

const statCards = [
  {
    label: "今日 PV",
    value: "7,677",
    change: "+12.8%",
    icon: RadioTower,
  },
  {
    label: "今日 UV",
    value: "2,732",
    change: "+8.4%",
    icon: Users,
  },
  {
    label: "运行服务",
    value: "42",
    change: "3 个待发布",
    icon: Link2,
  },
  {
    label: "可用域名",
    value: "9",
    change: "2 个自定义",
    icon: Globe2,
  },
];

const publishSteps = [
  { title: "后台服务 CRUD", status: "已完成设计", icon: CheckCircle2 },
  { title: "KV 快照发布", status: "开发中", icon: Clock3 },
  { title: "Worker 边缘跳转", status: "骨架就绪", icon: ShieldCheck },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const services = await listServiceRows(user);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">概览</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理 WhatsApp / Telegram / Line 的边缘分流、发布状态和访问表现。
          </p>
        </div>
        <Button asChild>
          <Link href="/services/new">
            新建分流
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <div className="mt-2 text-2xl font-semibold">{item.value}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.change}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>近 7 天访问趋势</CardTitle>
              <CardDescription>正常分流访问，不包含被拦截请求。</CardDescription>
            </div>
            <Badge variant="secondary">PV / UV</Badge>
          </CardHeader>
          <CardContent>
            <TrafficChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>发布链路</CardTitle>
            <CardDescription>先打通后台到 Worker 的主路径。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {publishSteps.map((step) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-muted-foreground">{step.status}</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">最近服务</h2>
            <p className="text-sm text-muted-foreground">下一步会接真实 API 和 KV 发布状态。</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/services">查看全部</Link>
          </Button>
        </div>
        <ServicesTable data={services.slice(0, 3)} />
      </section>
    </div>
  );
}
