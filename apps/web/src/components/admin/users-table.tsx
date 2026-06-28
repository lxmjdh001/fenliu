"use client";

import { useState } from "react";
import { ShieldCheck, Star, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: "admin" | "member";
  membershipLevel: "free" | "vip";
  membershipExpiresAt: string;
  status: "active" | "banned";
  createdAt: string;
  updatedAt: string;
}

export function UsersTable({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);

  async function updateUser(id: number, patch: Partial<UserRow>) {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });
    const payload = await response.json();

    if (!response.ok) {
      toast.error(payload.message ?? "更新失败");
      return;
    }

    setUsers((current) => current.map((user) => (user.id === id ? payload.data : user)));
    toast.success("用户已更新");
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>权限</TableHead>
              <TableHead>会员</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>注册时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium">{user.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{user.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "success" : "secondary"}>
                    {user.role === "admin" ? "管理员" : "会员"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={user.membershipLevel === "vip" ? "success" : "outline"}>
                      {user.membershipLevel === "vip" ? "VIP" : "普通"}
                    </Badge>
                    {user.membershipExpiresAt ? (
                      <span className="text-xs text-muted-foreground">
                        到期：{new Date(user.membershipExpiresAt).toLocaleDateString("zh-CN")}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === "active" ? "success" : "destructive"}>
                    {user.status === "active" ? "正常" : "禁用"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(user.createdAt).toLocaleString("zh-CN")}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateUser(user.id, {
                          role: user.role === "admin" ? "member" : "admin",
                        })
                      }
                    >
                      <ShieldCheck className="size-4" />
                      {user.role === "admin" ? "设为会员" : "设为管理员"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateUser(user.id, {
                          membershipLevel: "vip",
                          membershipExpiresAt: oneYearLater(),
                        })
                      }
                    >
                      <Star className="size-4" />
                      升 VIP
                    </Button>
                    <Button
                      variant={user.status === "active" ? "destructive" : "outline"}
                      size="sm"
                      onClick={() =>
                        updateUser(user.id, {
                          status: user.status === "active" ? "banned" : "active",
                        })
                      }
                    >
                      {user.status === "active" ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                      {user.status === "active" ? "禁用" : "恢复"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function oneYearLater() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}
