"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Cloud,
  CreditCard,
  Gauge,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  Menu,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "概览", icon: LayoutDashboard },
  { href: "/services", label: "分流服务", icon: Link2 },
  { href: "/stats", label: "访问统计", icon: BarChart3 },
  { href: "/domains", label: "域名管理", icon: Globe2 },
  { href: "/billing", label: "套餐订单", icon: CreditCard },
];

const adminItems = [
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/cloudflare", label: "CF 状态", icon: Cloud },
  { href: "/admin/security", label: "拦截策略", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Fenliu</div>
            <div className="text-xs text-muted-foreground">Edge Router Console</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <NavSection items={navItems} pathname={pathname} />
          <Separator className="my-4" />
          <div className="mb-2 px-3 text-xs font-medium text-muted-foreground">管理员</div>
          <NavSection items={adminItems} pathname={pathname} />
        </div>
        <div className="border-t p-4">
          <div className="rounded-lg bg-accent p-3">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-accent-foreground">
              <Gauge className="size-4" />
              Worker 正常
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              KV 发布延迟约 5-60 秒，当前 Queue 无积压。
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-card/90 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="打开菜单">
              <Menu className="size-5" />
            </Button>
            <div>
              <div className="text-sm font-semibold">极速分流控制台</div>
              <div className="text-xs text-muted-foreground">WhatsApp / Telegram / Line</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <LifeBuoy className="size-4" />
              工单
            </Button>
            <Button size="sm" asChild>
              <Link href="/services/new">新建服务</Link>
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}

function NavSection({
  items,
  pathname,
}: {
  items: typeof navItems;
  pathname: string;
}) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-9 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
