import "server-only";

import type { Prisma, Service, ServiceTarget } from "@prisma/client";
import { z } from "zod";

import type { CurrentUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";

import { normalizeTarget } from "./platform-normalize";
import type {
  AccessRule,
  CreateServiceInput,
  EdgeBlockConfig,
  Platform,
  PublishStatus,
  ServiceRecord,
  ServiceRow,
  ServiceStatus,
  WhatsAppEntry,
} from "./types";

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

export const updateServiceSchema = createServiceSchema;

const defaultEdgeBlock: EdgeBlockConfig = {
  blockAllEnabled: false,
  countryAllowEnabled: false,
  allowedCountries: [],
  countryBlockEnabled: false,
  blockedCountries: [],
  blockChinese: false,
  ipBlockListIds: [],
  action: "not_found",
  redirectUrl: "",
};

type ServiceWithTargets = Service & {
  targets: ServiceTarget[];
};

export async function listServices(user?: CurrentUser | null) {
  const services = await prisma.service.findMany({
    where: user && user.role !== "admin" ? { userId: user.id } : undefined,
    include: {
      targets: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return services.map(toServiceRecord);
}

export async function listServiceRows(user?: CurrentUser | null): Promise<ServiceRow[]> {
  const services = await listServices(user);

  return services.map(toServiceRow);
}

export async function getService(id: string, user?: CurrentUser | null) {
  const numericId = Number(id);

  if (!Number.isInteger(numericId)) {
    return null;
  }

  const service = await prisma.service.findFirst({
    where: {
      id: numericId,
      ...(user && user.role !== "admin" ? { userId: user.id } : {}),
    },
    include: {
      targets: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return service ? toServiceRecord(service) : null;
}

export async function createService(input: CreateServiceInput, user: CurrentUser) {
  const parsed = createServiceSchema.parse(input);
  const normalizedTargets = dedupeTargets(parsed);
  const globalGreeting = parsed.platform === "whatsapp" ? (parsed.greeting ?? "") : "";
  const membershipExpiresAt = user.membershipExpiresAt ? new Date(user.membershipExpiresAt) : null;
  const shortCode = await generateUniqueShortCode(parsed.platform);

  const service = await prisma.$transaction(async (tx) => {
    const created = await tx.service.create({
      data: {
        userId: user.id,
        name: parsed.name,
        platform: parsed.platform,
        shortCode,
        domain: parsed.domain,
        status: "enabled",
        accessRule: parsed.accessRule,
        whatsappEntry: parsed.whatsappEntry,
        lockIP: parsed.lockIP,
        ipLockGroupId: `group_${shortCode}`,
        greetingMode: globalGreeting ? "single" : "none",
        globalGreeting,
        greetingPool: [],
        edgeBlock: defaultEdgeBlock as unknown as Prisma.InputJsonValue,
        publishStatus: "pending",
        membershipExpiresAt,
        targets: {
          createMany: {
            data: normalizedTargets.map((target, index) => ({
              targetKey: `target_${index + 1}`,
              url: target.url,
              normalizedUrl: target.normalizedUrl,
              remark: target.remark || `客服${index + 1}`,
              greeting: "",
              enabled: true,
              sortOrder: index + 1,
            })),
          },
        },
      },
    });

    await tx.service.update({
      where: { id: created.id },
      data: {
        ipLockGroupId: `group_${created.id}`,
      },
    });

    return tx.service.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        targets: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  });

  return toServiceRecord(service);
}

export async function updateService(id: string, input: CreateServiceInput, user: CurrentUser) {
  const numericId = Number(id);

  if (!Number.isInteger(numericId)) {
    return null;
  }

  const existing = await prisma.service.findFirst({
    where: {
      id: numericId,
      ...(user.role !== "admin" ? { userId: user.id } : {}),
    },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const parsed = updateServiceSchema.parse(input);
  const normalizedTargets = dedupeTargets(parsed);
  const globalGreeting = parsed.platform === "whatsapp" ? (parsed.greeting ?? "") : "";

  const service = await prisma.$transaction(async (tx) => {
    await tx.serviceTarget.deleteMany({
      where: { serviceId: numericId },
    });

    await tx.service.update({
      where: { id: numericId },
      data: {
        name: parsed.name,
        platform: parsed.platform,
        domain: parsed.domain,
        accessRule: parsed.accessRule,
        whatsappEntry: parsed.whatsappEntry,
        lockIP: parsed.lockIP,
        greetingMode: globalGreeting ? "single" : "none",
        globalGreeting,
        greetingPool: [],
        publishStatus: "pending",
        publishError: "",
        publishedAt: null,
        targets: {
          createMany: {
            data: normalizedTargets.map((target, index) => ({
              targetKey: `target_${index + 1}`,
              url: target.url,
              normalizedUrl: target.normalizedUrl,
              remark: target.remark || `客服${index + 1}`,
              greeting: "",
              enabled: true,
              sortOrder: index + 1,
            })),
          },
        },
      },
    });

    return tx.service.findUniqueOrThrow({
      where: { id: numericId },
      include: {
        targets: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  });

  return toServiceRecord(service);
}

export async function deleteService(id: string, user: CurrentUser) {
  const numericId = Number(id);

  if (!Number.isInteger(numericId)) {
    return false;
  }

  const service = await prisma.service.findFirst({
    where: {
      id: numericId,
      ...(user.role !== "admin" ? { userId: user.id } : {}),
    },
    select: { id: true },
  });

  if (!service) {
    return false;
  }

  await prisma.service.delete({
    where: { id: numericId },
  });

  return true;
}

export async function markPublished(id: string, snapshots?: { route: unknown; service: unknown }) {
  const numericId = Number(id);

  if (!Number.isInteger(numericId)) {
    return null;
  }

  const service = await prisma.service.findUnique({
    where: { id: numericId },
  });

  if (!service) {
    return null;
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.service.update({
      where: { id: numericId },
      data: {
        publishStatus: "success",
        publishError: "",
        publishedAt: now,
      },
      include: {
        targets: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (snapshots) {
      await tx.publishSnapshot.create({
        data: {
          serviceId: numericId,
          routeKey: `route:${service.shortCode}`,
          serviceKey: `service:${service.platform}:${service.shortCode}`,
          routeSnapshotJson: snapshots.route as Prisma.InputJsonValue,
          serviceSnapshotJson: snapshots.service as Prisma.InputJsonValue,
          status: "success",
        },
      });
    }

    return next;
  });

  return toServiceRecord(updated);
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

function toServiceRecord(service: ServiceWithTargets): ServiceRecord {
  return {
    id: String(service.id),
    userId: service.userId,
    name: service.name,
    platform: service.platform as Platform,
    shortCode: service.shortCode,
    domain: service.domain,
    status: service.status as ServiceStatus,
    accessRule: service.accessRule as AccessRule,
    whatsappEntry: service.whatsappEntry as WhatsAppEntry,
    lockIP: service.lockIP,
    ipLockGroupId: service.ipLockGroupId,
    greetingMode: service.greetingMode,
    globalGreeting: service.globalGreeting,
    greetingPool: parseStringArray(service.greetingPool),
    targets: service.targets.map((target) => ({
      id: String(target.id),
      targetKey: target.targetKey,
      url: target.url,
      normalizedUrl: target.normalizedUrl,
      remark: target.remark,
      greeting: target.greeting,
      enabled: target.enabled,
    })),
    edgeBlock: parseEdgeBlock(service.edgeBlock),
    publishStatus: service.publishStatus as PublishStatus,
    publishError: service.publishError,
    publishedAt: service.publishedAt?.toISOString() ?? "",
    membershipExpiresAt: service.membershipExpiresAt?.toISOString() ?? "",
    todayPv: service.todayPv,
    todayUv: service.todayUv,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
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

async function generateUniqueShortCode(platform: Platform) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const shortCode = generateShortCode(platform);
    const existing = await prisma.service.findUnique({
      where: { shortCode },
      select: { id: true },
    });

    if (!existing) {
      return shortCode;
    }
  }

  throw new Error("短码生成失败，请重试");
}

function generateShortCode(platform: Platform) {
  const prefix = platform === "whatsapp" ? "wa" : platform === "telegram" ? "tg" : "ln";
  const random = Math.random().toString(36).slice(2, 7);

  return `${prefix}${random}`;
}

function parseStringArray(value: Prisma.JsonValue) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseEdgeBlock(value: Prisma.JsonValue): EdgeBlockConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultEdgeBlock;
  }

  return {
    ...defaultEdgeBlock,
    ...(value as Partial<EdgeBlockConfig>),
  };
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
