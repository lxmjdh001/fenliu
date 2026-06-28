"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(mode === "login" ? "admin@fenliu.local" : "");
  const [password, setPassword] = useState(mode === "login" ? "admin123456" : "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.message ?? "操作失败");
        return;
      }

      toast.success(mode === "login" ? "登录成功" : "注册成功");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="size-5" />
          </div>
          <CardTitle>{mode === "login" ? "登录 Fenliu" : "注册 Fenliu"}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "进入 WhatsApp / Telegram / Line 极速分流控制台。"
              : "注册后默认是普通会员，管理员可在用户管理里升级 VIP。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {mode === "register" ? (
              <Field label="名称">
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="你的名称" />
              </Field>
            ) : null}
            <Field label="邮箱">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="密码">
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
              />
            </Field>
            <Button className="w-full" disabled={isSubmitting}>
              {mode === "login" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
              {isSubmitting ? "提交中" : mode === "login" ? "登录" : "注册"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                还没有账号？{" "}
                <Link href="/register" className="font-medium text-primary">
                  去注册
                </Link>
              </>
            ) : (
              <>
                已有账号？{" "}
                <Link href="/login" className="font-medium text-primary">
                  去登录
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
