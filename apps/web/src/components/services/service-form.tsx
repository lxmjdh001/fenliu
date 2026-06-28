"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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

const maxTargets = 5000;

const serviceSchema = z.object({
  name: z.string().min(2, "请输入服务名称"),
  platform: z.enum(["whatsapp", "telegram", "line"]),
  domain: z.string().min(3, "请选择或输入域名"),
  accessRule: z.enum(["random", "sequence"]),
  lockIP: z.boolean(),
  greeting: z.string().optional(),
  batchTargets: z.string().min(1, "请输入至少一个账号"),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;
type Step = "basic" | "targets" | "rules";

export function ServiceForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("basic");
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      platform: "whatsapp",
      domain: "go.example.com",
      accessRule: "random",
      lockIP: false,
      greeting: "",
      batchTargets: "",
    },
  });

  const selectedAccessRule = useWatch({
    control: form.control,
    name: "accessRule",
  });
  const isFinalStep = currentStep === "rules";

  async function goNext() {
    if (currentStep === "basic") {
      const isValid = await form.trigger(["name", "platform", "greeting"]);

      if (!isValid) {
        return;
      }

      setCurrentStep("targets");
      return;
    }

    const targets = parseBatchTargets(form.getValues("batchTargets"));

    if (!targets.length) {
      form.setError("batchTargets", {
        message: "请输入至少一个账号",
      });
      return;
    }

    if (targets.length > maxTargets) {
      form.setError("batchTargets", {
        message: `最多输入 ${maxTargets} 条账号`,
      });
      return;
    }

    form.clearErrors("batchTargets");
    setCurrentStep("rules");
  }

  async function onSubmit(values: ServiceFormValues) {
    const targets = parseBatchTargets(values.batchTargets);

    if (!targets.length) {
      toast.error("请输入至少一个账号");
      return;
    }

    if (targets.length > maxTargets) {
      toast.error(`最多输入 ${maxTargets} 条账号`);
      return;
    }

    const response = await fetch("/api/services", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...values,
        targets,
      }),
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
        <Tabs value={currentStep} onValueChange={(value) => setCurrentStep(value as Step)}>
          <TabsList>
            <TabsTrigger value="basic">基础设置</TabsTrigger>
            <TabsTrigger value="targets">账号列表</TabsTrigger>
            <TabsTrigger value="rules">分流规则</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>基础设置</CardTitle>
                <CardDescription>配置平台和服务名称，保存后会生成短码。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <input type="hidden" {...form.register("domain")} />
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
              <CardHeader>
                <CardTitle>账号列表</CardTitle>
                <CardDescription>保存时会自动清理空格、去重并规范化账号。</CardDescription>
              </CardHeader>
              <CardContent>
                <Field label="批量输入" error={form.formState.errors.batchTargets?.message}>
                  <Textarea
                    className="min-h-72 bg-white"
                    placeholder="一行一个，请输入手机号/链接，最多输入5000条。"
                    {...form.register("batchTargets")}
                  />
                </Field>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>分流规则</CardTitle>
                <CardDescription>设置账号分配方式；拦截策略会在下一步接入。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <RuleOption
                    title="随机"
                    description="最高性能，适合大多数分流场景。"
                    selected={selectedAccessRule === "random"}
                    onClick={() => form.setValue("accessRule", "random", { shouldDirty: true })}
                  />
                  <RuleOption
                    title="顺序"
                    description="边缘近似顺序，不保证全球严格轮询。"
                    selected={selectedAccessRule === "sequence"}
                    onClick={() => form.setValue("accessRule", "sequence", { shouldDirty: true })}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <Label htmlFor="lock-ip">IP 锁定</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      独立开关；开启后会覆盖随机或顺序，保证同一 IP 固定分到同一客服。
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline">
            保存草稿
          </Button>
          {isFinalStep ? (
            <Button type="submit">
              <Save className="size-4" />
              {form.formState.isSubmitting ? "保存中" : "保存并发布"}
            </Button>
          ) : (
            <Button type="button" onClick={goNext}>
              下一步
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
    </form>
  );
}

function RuleOption({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        "rounded-lg border p-4 text-left transition-colors hover:border-primary " +
        (selected ? "border-primary bg-accent" : "bg-white")
      }
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{title}</div>
        <span
          className={
            "size-3 rounded-full border " +
            (selected ? "border-primary bg-primary" : "border-muted-foreground/40")
          }
        />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </button>
  );
}

function parseBatchTargets(input: string): Array<{ remark?: string; url: string }> {
  const targets = [];
  const seen = new Set<string>();

  for (const rawLine of input.split(/\r?\n/)) {
    const line = normalizeBatchTarget(rawLine);

    if (!line) {
      continue;
    }

    const key = line.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    targets.push({ url: line });
  }

  return targets;
}

function normalizeBatchTarget(input: string) {
  return input.trim().replace(/[\s()-]/g, "");
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
