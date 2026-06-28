"use client";

import { useState } from "react";
import { CheckCircle2, Cloud, EyeOff, PlugZap, Save } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PublicCloudflareSettings {
  accountId: string;
  kvNamespaceId: string;
  queueName: string;
  workerName: string;
  workerUrl: string;
  tokenConfigured: boolean;
  maskedToken: string;
  updatedAt: string;
}

interface CloudflareAccount {
  id: string;
  name: string;
}

export function CloudflareSettingsForm({
  initialSettings,
}: {
  initialSettings: PublicCloudflareSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [apiToken, setApiToken] = useState("");
  const [accountId, setAccountId] = useState(initialSettings.accountId);
  const [kvNamespaceId, setKvNamespaceId] = useState(initialSettings.kvNamespaceId);
  const [queueName, setQueueName] = useState(initialSettings.queueName);
  const [workerName, setWorkerName] = useState(initialSettings.workerName);
  const [workerUrl, setWorkerUrl] = useState(initialSettings.workerUrl);
  const [accounts, setAccounts] = useState<CloudflareAccount[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  async function save() {
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/cloudflare/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiToken,
          accountId,
          kvNamespaceId,
          queueName,
          workerName,
          workerUrl,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.message ?? "保存失败");
        return;
      }

      setSettings(payload.data);
      setApiToken("");
      toast.success("Cloudflare 配置已保存");
    } finally {
      setIsSaving(false);
    }
  }

  async function testConnection() {
    setIsTesting(true);

    try {
      const response = await fetch("/api/admin/cloudflare/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiToken,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.message ?? "连接失败");
        return;
      }

      setAccounts(payload.data.accounts);
      toast.success("Cloudflare 连接成功");
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Cloudflare API 配置</CardTitle>
              <CardDescription>
                Token 只保存在服务器端，前端不会回显明文；留空保存时会保留旧 token。
              </CardDescription>
            </div>
            <Badge variant={settings.tokenConfigured ? "success" : "warning"}>
              {settings.tokenConfigured ? "Token 已配置" : "未配置 Token"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Cloudflare API Token">
              <Input
                type="password"
                autoComplete="off"
                placeholder={settings.maskedToken || "粘贴 Cloudflare API Token"}
                value={apiToken}
                onChange={(event) => setApiToken(event.target.value)}
              />
              {settings.maskedToken ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <EyeOff className="size-3.5" />
                  当前：{settings.maskedToken}
                </div>
              ) : null}
            </Field>

            <Field label="Account ID">
              <Input
                placeholder="Cloudflare Account ID"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
              />
            </Field>

            <Field label="KV Namespace ID">
              <Input
                placeholder="用于发布 route/service snapshot 的 KV ID"
                value={kvNamespaceId}
                onChange={(event) => setKvNamespaceId(event.target.value)}
              />
            </Field>

            <Field label="Queue 名称">
              <Input
                placeholder="fenliu-track-events-dev"
                value={queueName}
                onChange={(event) => setQueueName(event.target.value)}
              />
            </Field>

            <Field label="Worker 名称">
              <Input
                placeholder="fenliu-router-dev"
                value={workerName}
                onChange={(event) => setWorkerName(event.target.value)}
              />
            </Field>

            <Field label="Worker 测试地址">
              <Input
                placeholder="https://xxx.workers.dev"
                value={workerUrl}
                onChange={(event) => setWorkerUrl(event.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={save} disabled={isSaving}>
              <Save className="size-4" />
              {isSaving ? "保存中" : "保存配置"}
            </Button>
            <Button type="button" variant="outline" onClick={testConnection} disabled={isTesting}>
              <PlugZap className="size-4" />
              {isTesting ? "测试中" : "测试连接"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>当前状态</CardTitle>
            <CardDescription>后台发布服务时将读取这份配置。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatusItem label="Token" ok={settings.tokenConfigured} value={settings.maskedToken || "未设置"} />
            <StatusItem label="Account" ok={Boolean(accountId)} value={accountId || "未设置"} />
            <StatusItem label="KV" ok={Boolean(kvNamespaceId)} value={kvNamespaceId || "未设置"} />
            <StatusItem label="Worker" ok={Boolean(workerName)} value={workerName || "未设置"} />
            {settings.updatedAt ? (
              <p className="text-xs text-muted-foreground">
                最近保存：{new Date(settings.updatedAt).toLocaleString("zh-CN")}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>连接测试</CardTitle>
            <CardDescription>测试成功后会显示 token 可访问的账号。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.length ? (
              accounts.map((account) => (
                <div key={account.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Cloud className="size-4 text-primary" />
                    {account.name}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{account.id}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">还没有测试结果。</p>
            )}
          </CardContent>
        </Card>
      </div>
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

function StatusItem({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border p-3">
      <CheckCircle2 className={ok ? "mt-0.5 size-4 text-emerald-600" : "mt-0.5 size-4 text-muted-foreground"} />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 break-all font-mono text-xs">{value}</div>
      </div>
    </div>
  );
}
