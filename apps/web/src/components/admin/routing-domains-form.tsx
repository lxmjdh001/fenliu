"use client";

import { useState } from "react";
import { Globe2, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface RoutingDomainRow {
  id: number;
  domain: string;
  label: string;
  type: "public" | "customer";
  enabled: boolean;
  isDefault: boolean;
}

export function RoutingDomainsForm({ initialDomains }: { initialDomains: RoutingDomainRow[] }) {
  const [domains, setDomains] = useState(initialDomains);
  const [domain, setDomain] = useState("");
  const [label, setLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function createDomain() {
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/routing-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          label,
          type: "public",
          enabled: true,
          isDefault: domains.length === 0,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.message ?? "保存失败");
        return;
      }

      setDomains((current) => [payload.data, ...current]);
      setDomain("");
      setLabel("");
      toast.success("分流域名已添加");
    } finally {
      setIsSaving(false);
    }
  }

  async function patchDomain(id: number, patch: Partial<RoutingDomainRow>) {
    const response = await fetch(`/api/admin/routing-domains/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const payload = await response.json();

    if (!response.ok) {
      toast.error(payload.message ?? "更新失败");
      return;
    }

    setDomains((current) =>
      current.map((item) => (item.id === id ? payload.data : patch.isDefault ? { ...item, isDefault: false } : item)),
    );
    toast.success("已更新");
  }

  async function removeDomain(id: number) {
    const confirmed = window.confirm("确定删除这个分流域名吗？");

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/admin/routing-domains/${id}`, {
      method: "DELETE",
    });
    const payload = await response.json();

    if (!response.ok) {
      toast.error(payload.message ?? "删除失败");
      return;
    }

    setDomains((current) => current.filter((item) => item.id !== id));
    toast.success("已删除");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle>分流域名池</CardTitle>
          <CardDescription>复制链接和后续发布 Worker 路由时，只使用这里配置的域名。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {domains.length ? (
            domains.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Globe2 className="size-4 text-primary" />
                    <span className="font-medium">{item.label || item.domain}</span>
                    {item.isDefault ? <Badge variant="success">默认</Badge> : null}
                    <Badge variant={item.enabled ? "secondary" : "warning"}>
                      {item.enabled ? "启用" : "停用"}
                    </Badge>
                  </div>
                  <div className="mt-1 break-all font-mono text-xs text-muted-foreground">{item.domain}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">启用</span>
                    <Switch checked={item.enabled} onCheckedChange={(enabled) => patchDomain(item.id, { enabled })} />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={item.isDefault}
                    onClick={() => patchDomain(item.id, { isDefault: true, enabled: true })}
                  >
                    <Star className="size-4" />
                    设默认
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="删除域名" onClick={() => removeDomain(item.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              还没有配置分流域名。请先添加 Cloudflare Worker 绑定的域名。
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>添加域名</CardTitle>
          <CardDescription>填写真正用于访问 Worker 的域名，不是后台管理域名。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="域名">
            <Input placeholder="例如：go.example.com" value={domain} onChange={(event) => setDomain(event.target.value)} />
          </Field>
          <Field label="显示名称">
            <Input placeholder="例如：公共域名 1" value={label} onChange={(event) => setLabel(event.target.value)} />
          </Field>
          <Button type="button" onClick={createDomain} disabled={isSaving || !domain.trim()}>
            <Plus className="size-4" />
            {isSaving ? "添加中" : "添加分流域名"}
          </Button>
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
