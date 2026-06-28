import "server-only";

import { z } from "zod";

import { normalizeTarget } from "./platform-normalize";
import type { CreateServiceInput, ServiceRecord, ServiceRow } from "./types";

export const createServiceSchema = z.object({
  name: z.string().trim().min(2, "请输入服务名称").max(80, "服务名称最多 80 个字符"),
  platform: z.enum(["whatsapp", "telegram", "line"]),
  domain: z.string().trim().min(3, "请选择或输入域名").max(120, "域名过长"),
  accessRule: z.enum(["random", "sequence"]),
  whatsappEntry: z.enum(["wa_me", "api_send"]).optional().default("wa_me"),
  lockIP: z.boolean().optional().default(false),
  greeting: z.string().trim().max(500, "问候语最多 500 个字符").optional(),
  targets: z
    .array(
      z.object({
        remark: z.string().trim().max(40, "备注最多 40 个字符").optional(),
        url: z
          .string()
          .trim()
          .transform((value) => value.replace(/[\s()-]/g, ""))
          .pipe(z.string().min(2, "请输入账号或链接").max(300, "账号或链接过长")),
      }),
    )
    .min(1, "至少添加一个账号")
    .max(5000, "单个服务最多添加 5000 个账号"),
});

const initialServices: ServiceRecord[] = [
  seedService({
    id: "10001",
    name: "德国 WhatsApp 客服组",
    platform: "whatsapp",
    shortCode: "wa8de2",
    domain: "go.example.com",
    accessRule: "random",
    whatsappEntry: "wa_me",
    lockIP: true,
    targets: ["60123456789", "60199887766", "491522334455"],
    todayPv: 3842,
    todayUv: 1244,
    publishStatus: "success",
  }),
  seedService({
    id: "10002",
    name: "Telegram 私域接待",
    platform: "telegram",
    shortCode: "tg9vip",
    domain: "mp.customer.com",
    accessRule: "random",
    whatsappEntry: "wa_me",
    lockIP: false,
    targets: ["@sales_a", "@sales_b", "https://t.me/sales_c"],
    todayPv: 2210,
    todayUv: 876,
    publishStatus: "pending",
  }),
  seedService({
    id: "10003",
    name: "Line 日本渠道",
    platform: "line",
    shortCode: "lnjp33",
    domain: "go.example.com",
    accessRule: "sequence",
    whatsappEntry: "wa_me",
    lockIP: false,
    targets: ["@line_a", "@line_b"],
    todayPv: 1197,
    todayUv: 423,
    status: "paused",
    publishStatus: "success",
  }),
  seedService({
    id: "10004",
    name: "WhatsApp 北美广告",
    platform: "whatsapp",
    shortCode: "waus77",
    domain: "wa.example.com",
    accessRule: "random",
    whatsappEntry: "api_send",
    lockIP: false,
    targets: ["14155552671", "14155552672"],
    todayPv: 428,
    todayUv: 189,
    status: "expired",
    publishStatus: "failed",
    publishError: "Cloudflare KV namespace 未配置",
  }),
];

const globalStore = globalThis as typeof globalThis & {
  __fenliuServices?: ServiceRecord[];
  __fenliuNextServiceId?: number;
};

if (!globalStore.__fenliuServices) {
  globalStore.__fenliuServices = initialServices;
  globalStore.__fenliuNextServiceId = 10005;
}

export function listServices() {
  return [...globalStore.__fenliuServices!].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listServiceRows(): ServiceRow[] {
  return listServices().map(toServiceRow);
}

export function getService(id: string) {
  return globalStore.__fenliuServices!.find((service) => service.id === id) ?? null;
}

export function createService(input: CreateServiceInput) {
  const parsed = createServiceSchema.parse(input);
  const now = new Date().toISOString();
  const id = String(globalStore.__fenliuNextServiceId!++);
  const shortCode = generateShortCode(parsed.platform);
  const normalizedTargets = dedupeTargets(parsed);
  const globalGreeting = parsed.platform === "whatsapp" ? (parsed.greeting ?? "") : "";

  const service: ServiceRecord = {
    id,
    userId: 20001,
    name: parsed.name,
    platform: parsed.platform,
    shortCode,
    domain: parsed.domain,
    status: "enabled",
    accessRule: parsed.accessRule,
    whatsappEntry: parsed.whatsappEntry,
    lockIP: parsed.lockIP,
    ipLockGroupId: `group_${id}`,
    greetingMode: globalGreeting ? "single" : "none",
    globalGreeting,
    greetingPool: [],
    targets: normalizedTargets.map((target, index) => ({
      id: `${id}_${index + 1}`,
      targetKey: `target_${index + 1}`,
      url: target.url,
      normalizedUrl: target.normalizedUrl,
      remark: target.remark || `客服${index + 1}`,
      greeting: "",
      enabled: true,
    })),
    edgeBlock: {
      blockAllEnabled: false,
      countryAllowEnabled: false,
      allowedCountries: [],
      countryBlockEnabled: false,
      blockedCountries: [],
      blockChinese: false,
      ipBlockListIds: [],
      action: "not_found",
      redirectUrl: "",
    },
    publishStatus: "pending",
    publishError: "",
    publishedAt: "",
    membershipExpiresAt: "2026-12-31T23:59:59.000Z",
    todayPv: 0,
    todayUv: 0,
    createdAt: now,
    updatedAt: now,
  };

  globalStore.__fenliuServices!.unshift(service);

  return service;
}

export function markPublished(id: string) {
  const service = getService(id);

  if (!service) {
    return null;
  }

  const now = new Date().toISOString();
  service.publishStatus = "success";
  service.publishError = "";
  service.publishedAt = now;
  service.updatedAt = now;

  return service;
}

export function toServiceRow(service: ServiceRecord): ServiceRow {
  return {
    id: service.id,
    name: service.name,
    platform: service.platform,
    shortCode: service.shortCode,
    domain: service.domain,
    accessRule: service.accessRule,
    whatsappEntry: service.whatsappEntry,
    lockIP: service.lockIP,
    targets: service.targets.filter((target) => target.enabled).length,
    todayPv: service.todayPv,
    todayUv: service.todayUv,
    status: service.status,
    publishStatus: service.publishStatus,
    updatedAt: formatDateTime(service.updatedAt),
  };
}

function seedService(
  input: Pick<
    ServiceRecord,
    | "id"
    | "name"
    | "platform"
    | "shortCode"
    | "domain"
    | "accessRule"
    | "whatsappEntry"
    | "lockIP"
    | "todayPv"
    | "todayUv"
    | "publishStatus"
  > &
    Partial<Pick<ServiceRecord, "status" | "publishError">> & {
      targets: string[];
    },
): ServiceRecord {
  const now = new Date("2026-06-28T01:30:00.000Z").toISOString();

  return {
    ...input,
    userId: 20001,
    status: input.status ?? "enabled",
    ipLockGroupId: `group_${input.id}`,
    greetingMode: "single",
    globalGreeting: "hello",
    greetingPool: [],
    targets: input.targets.map((target, index) => ({
      id: `${input.id}_${index + 1}`,
      targetKey: `target_${index + 1}`,
      url: target,
      normalizedUrl: normalizeTarget(input.platform, target),
      remark: `客服${index + 1}`,
      greeting: "",
      enabled: true,
    })),
    edgeBlock: {
      blockAllEnabled: false,
      countryAllowEnabled: false,
      allowedCountries: [],
      countryBlockEnabled: false,
      blockedCountries: [],
      blockChinese: false,
      ipBlockListIds: [],
      action: "not_found",
      redirectUrl: "",
    },
    publishError: input.publishError ?? "",
    publishedAt: input.publishStatus === "success" ? now : "",
    membershipExpiresAt: "2026-12-31T23:59:59.000Z",
    createdAt: now,
    updatedAt: now,
  };
}

function dedupeTargets(input: z.infer<typeof createServiceSchema>) {
  const unique = new Map<string, { remark: string; url: string; normalizedUrl: string }>();

  for (const target of input.targets) {
    const normalizedUrl = normalizeTarget(input.platform, target.url);
    const key = normalizedUrl.toLowerCase();

    if (!unique.has(key)) {
      unique.set(key, {
        remark: target.remark ?? "",
        url: target.url,
        normalizedUrl,
      });
    }
  }

  return [...unique.values()];
}

function generateShortCode(platform: ServiceRecord["platform"]) {
  const prefix = platform === "whatsapp" ? "wa" : platform === "telegram" ? "tg" : "ln";
  const random = Math.random().toString(36).slice(2, 7);
  return `${prefix}${random}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(value))
    .replace(/\//g, "-");
}
