"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const serviceSchema = z.object({
  name: z.string().min(2, "请输入服务名称"),
  platform: z.enum(["whatsapp", "telegram", "line"]),
  domain: z.string().min(3, "请选择或输入域名"),
  accessRule: z.enum(["random", "sequence"]),
  lockIP: z.boolean(),
  greeting: z.string().optional(),
  targets: z
    .array(
      z.object({
        remark: z.string().optional(),
        url: z.string().min(2, "请输入账号或链接"),
      }),
    )
    .min(1),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

export function ServiceForm() {
  const router = useRouter();
  const [batchTargets, setBatchTargets] = useState("");
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      platform: "whatsapp",
      domain: "go.example.com",
      accessRule: "random",
      lockIP: false,
      greeting: "",
      targets: [{ remark: "客服A", url: "" }],
    },
  });

  const { fields, append, replace } = useFieldArray({
    control: form.control,
    name: "targets",
  });

  function handleBatchImport() {
    const imported = parseBatchTargets(batchTargets);

    if (!imported.length) {
      toast.error("没有识别到可导入的账号");
      return;
    }

    const currentTargets = form.getValues("targets");
    const shouldReplaceBlankDefault =
      currentTargets.length === 1 && !currentTargets[0]?.url.trim();

    if (shouldReplaceBlankDefault) {
      replace(imported);
    } else {
      append(imported);
    }

    setBatchTargets("");
    toast.success(`已导入 ${imported.length} 个账号`);
  }

  async function onSubmit(values: ServiceFormValues) {
    const response = await fetch("/api/services", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const payload = await response.json();

    if (!response.ok) {
      toast.error(payload.message ?? "创建服务失败");
      return;
    }

    toast.success("服务已创建，正在进入详情页。");
    router.push(`/services/${payload.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">基础设置</TabsTrigger>
            <TabsTrigger value="targets">账号列表</TabsTrigger>
            <TabsTrigger value="rules">分流规则</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>基础设置</CardTitle>
                <CardDescription>配置平台、域名和服务名称，保存后会生成短码。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <Field label="服务名称" error={form.formState.errors.name?.message}>
                  <Input placeholder="例如：德国 WhatsApp 客服组" {...form.register("name")} />
                </Field>
                <Field label="平台">
                  <select
                    className="h-9 w-full rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...form.register("platform")}
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="line">Line</option>
                  </select>
                </Field>
                <Field label="域名" error={form.formState.errors.domain?.message}>
                  <Input placeholder="go.example.com" {...form.register("domain")} />
                </Field>
                <Field label="分流规则">
                  <select
                    className="h-9 w-full rounded-md border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...form.register("accessRule")}
                  >
                    <option value="random">随机</option>
                    <option value="sequence">顺序</option>
                  </select>
                </Field>
                <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <div>
                    <Label htmlFor="lock-ip">IP 锁定</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      开启后，同一 IP 会固定访问同一个客服号。
                    </p>
                  </div>
                  <Controller
                    control={form.control}
                    name="lockIP"
                    render={({ field }) => (
                      <Switch
                        id="lock-ip"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
                <Field label="全局问候语" className="md:col-span-2">
                  <Textarea
                    placeholder="WhatsApp 可自动拼接 text 参数；多条问候语后续会支持按行随机。"
                    {...form.register("greeting")}
                  />
                </Field>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="targets">
            <Card>
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>账号列表</CardTitle>
                  <CardDescription>第一版会在保存时自动去重并规范化账号。</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ remark: "", url: "" })}
                >
                  <Plus className="size-4" />
                  添加账号
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 rounded-lg border bg-secondary/35 p-3 md:grid-cols-[1fr_auto] md:items-end">
                  <Field label="批量输入">
                    <Textarea
                      className="min-h-28 bg-white"
                      placeholder={"一行一个账号\n客服A,60123456789\n客服B @sales_b\nhttps://line.me/ti/p/example"}
                      value={batchTargets}
                      onChange={(event) => setBatchTargets(event.target.value)}
                    />
                  </Field>
                  <Button type="button" variant="outline" onClick={handleBatchImport}>
                    <Upload className="size-4" />
                    导入账号
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[180px_1fr]">
                    <Field label="备注">
                      <Input placeholder="客服备注" {...form.register(`targets.${index}.remark`)} />
                    </Field>
                    <Field
                      label="账号或链接"
                      error={form.formState.errors.targets?.[index]?.url?.message}
                    >
                      <Input
                        placeholder="手机号、@username、line id 或完整链接"
                        {...form.register(`targets.${index}.url`)}
                      />
                    </Field>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>分流与拦截</CardTitle>
                <CardDescription>国家、中文浏览器和 IP 黑名单会在下一步接入。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium">随机</div>
                  <p className="mt-2 text-sm text-muted-foreground">最高性能，适合大多数分流场景。</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium">顺序</div>
                  <p className="mt-2 text-sm text-muted-foreground">边缘近似顺序，不保证全球严格轮询。</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium">IP 锁定</div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    独立开关；开启后会覆盖随机或顺序，保证同一 IP 固定分到同一客服。
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline">
            保存草稿
          </Button>
          <Button type="submit">
            <Save className="size-4" />
            {form.formState.isSubmitting ? "保存中" : "保存并发布"}
          </Button>
        </div>
    </form>
  );
}

function parseBatchTargets(input: string): Array<{ remark?: string; url: string }> {
  const targets = [];
  const seen = new Set<string>();

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const parsed = parseBatchLine(line);

    if (!parsed?.url) {
      continue;
    }

    const key = parsed.url.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    targets.push(parsed);
  }

  return targets;
}

function parseBatchLine(line: string): { remark?: string; url: string } | null {
  const delimited = line.split(/\t|,|，/).map((item) => item.trim()).filter(Boolean);

  if (delimited.length >= 2) {
    return {
      remark: delimited.slice(0, -1).join(" "),
      url: delimited[delimited.length - 1],
    };
  }

  const parts = line.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return {
      url: parts[0],
    };
  }

  return {
    remark: parts.slice(0, -1).join(" "),
    url: parts[parts.length - 1],
  };
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
