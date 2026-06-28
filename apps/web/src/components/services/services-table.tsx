"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Copy, Edit3, Eye, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  accessRuleLabels,
  platformLabels,
} from "@/lib/mock-data";
import type { Platform, ServiceRow } from "@/lib/services/types";

interface RoutingDomainOption {
  id: number;
  domain: string;
  label: string;
  type: "public" | "customer";
  enabled: boolean;
  isDefault: boolean;
}

const statusLabel = {
  enabled: "运行中",
  paused: "已暂停",
  expired: "已到期",
};

const publishLabel = {
  success: "已发布",
  pending: "等待生效",
  failed: "发布失败",
};

const platformTabs: Array<{ value: "all" | Platform; label: string }> = [
  { value: "all", label: "全部" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "line", label: "Line" },
];

const columns: ColumnDef<ServiceRow>[] = [
  {
    accessorKey: "name",
    header: "服务",
    cell: ({ row }) => (
      <div>
        <Link href={`/services/${row.original.id}`} className="font-medium hover:text-primary">
          {row.original.name}
        </Link>
        <div className="mt-1 text-xs text-muted-foreground">/{row.original.shortCode}</div>
      </div>
    ),
  },
  {
    accessorKey: "platform",
    header: "平台",
    cell: ({ row }) => <Badge variant="secondary">{platformLabels[row.original.platform]}</Badge>,
  },
  {
    accessorKey: "accessRule",
    header: "规则",
    cell: ({ row }) => accessRuleLabels[row.original.accessRule],
  },
  {
    accessorKey: "targets",
    header: "账号",
    cell: ({ row }) => `${row.original.targets} 个`,
  },
  {
    accessorKey: "lockIP",
    header: "IP 锁定",
    cell: ({ row }) =>
      row.original.lockIP ? (
        <Badge variant="success">已锁定</Badge>
      ) : (
        <Badge variant="secondary">未锁定</Badge>
      ),
  },
  {
    accessorKey: "todayUv",
    header: "今日 UV",
    cell: ({ row }) => row.original.todayUv.toLocaleString(),
  },
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => {
      const variant =
        row.original.status === "enabled"
          ? "success"
          : row.original.status === "paused"
            ? "warning"
            : "destructive";

      return <Badge variant={variant}>{statusLabel[row.original.status]}</Badge>;
    },
  },
  {
    accessorKey: "publishStatus",
    header: "发布",
    cell: ({ row }) => {
      const variant =
        row.original.publishStatus === "success"
          ? "success"
          : row.original.publishStatus === "pending"
            ? "warning"
            : "destructive";

      return <Badge variant={variant}>{publishLabel[row.original.publishStatus]}</Badge>;
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row, table }) => (
      <ServiceActions
        service={row.original}
        routingDomains={(table.options.meta as ServicesTableMeta | undefined)?.routingDomains ?? []}
      />
    ),
  },
];

interface ServicesTableMeta {
  routingDomains: RoutingDomainOption[];
}

export function ServicesTable({
  data,
  routingDomains,
}: {
  data: ServiceRow[];
  routingDomains: RoutingDomainOption[];
}) {
  // TanStack Table returns stable table helpers that React Compiler currently warns about.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: {
      routingDomains,
    } satisfies ServicesTableMeta,
  });
  const currentPlatform = (table.getColumn("platform")?.getFilterValue() as Platform | undefined) ?? "all";
  const platformCounts = data.reduce<Record<"all" | Platform, number>>(
    (counts, service) => {
      counts.all += 1;
      counts[service.platform] += 1;
      return counts;
    },
    {
      all: 0,
      whatsapp: 0,
      telegram: 0,
      line: 0,
    },
  );

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Tabs
              value={currentPlatform}
              onValueChange={(value) => {
                table.getColumn("platform")?.setFilterValue(value === "all" ? undefined : value);
              }}
            >
              <TabsList className="h-10 w-full justify-start overflow-x-auto lg:w-auto">
                {platformTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                    {tab.label}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {platformCounts[tab.value]}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative w-full lg:w-[360px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="搜索服务名称或短码"
                value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
              />
            </div>
          </div>
          <Button asChild>
            <Link href="/services/new">新建分流</Link>
          </Button>
        </div>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  暂无服务
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ServiceActions({
  service,
  routingDomains,
}: {
  service: ServiceRow;
  routingDomains: RoutingDomainOption[];
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const copyDomains = routingDomains.map((item) => ({
    label: item.label || (item.type === "customer" ? "客户域名" : "公共域名"),
    domain: item.domain,
  }));

  async function copyServiceLink(domain: string) {
    const link = `https://${domain}/v/${service.shortCode}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("访问链接已复制。");
    } catch {
      toast.error("复制失败，请手动复制访问链接。");
    }
  }

  async function deleteCurrentService() {
    const confirmed = window.confirm(`确定删除「${service.name}」吗？删除后不可恢复。`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/services/${service.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.message ?? "删除失败");
        return;
      }

      toast.success("服务已删除。");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" aria-label="查看详情" asChild>
        <Link href={`/services/${service.id}`}>
          <Eye className="size-4" />
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`${service.name} 复制链接`}>
            <Copy className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          {copyDomains.length ? (
            copyDomains.map((item) => (
              <DropdownMenuItem key={item.domain} onClick={() => copyServiceLink(item.domain)}>
                <Copy className="size-4" />
                <div>
                  <div>{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.domain}</div>
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>请先在后台配置分流域名</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${service.name} 更多操作`}
            disabled={isDeleting}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/services/${service.id}/edit`}>
              <Edit3 className="size-4" />
              编辑
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={deleteCurrentService}>
            <Trash2 className="size-4" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
