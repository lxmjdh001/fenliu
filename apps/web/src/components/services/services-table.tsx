"use client";

import Link from "next/link";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink, MoreHorizontal, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import type { ServiceRow } from "@/lib/services/types";

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
    accessorKey: "todayPv",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        今日 PV
        <ArrowUpDown className="size-3.5" />
      </Button>
    ),
    cell: ({ row }) => row.original.todayPv.toLocaleString(),
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
    cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" aria-label="打开链接">
          <ExternalLink className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label={`${row.original.name} 更多操作`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </div>
    ),
  },
];

export function ServicesTable({ data }: { data: ServiceRow[] }) {
  // TanStack Table returns stable table helpers that React Compiler currently warns about.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="搜索服务名称、短码或域名"
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            />
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
