import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/db/prisma";

export const routingDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(3, "请输入域名")
    .max(120, "域名过长")
    .transform(normalizeDomain),
  label: z.string().trim().max(40, "名称最多 40 个字符").optional(),
  type: z.enum(["public", "customer"]).optional().default("public"),
  enabled: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
});

export const updateRoutingDomainSchema = routingDomainSchema.partial();

export type RoutingDomainInput = z.infer<typeof routingDomainSchema>;

export async function listRoutingDomains(options?: { enabledOnly?: boolean }) {
  const domains = await prisma.routingDomain.findMany({
    where: options?.enabledOnly ? { enabled: true } : undefined,
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return domains.map((domain) => ({
    id: domain.id,
    domain: domain.domain,
    label: domain.label,
    type: domain.type as "public" | "customer",
    enabled: domain.enabled,
    isDefault: domain.isDefault,
    createdAt: domain.createdAt.toISOString(),
    updatedAt: domain.updatedAt.toISOString(),
  }));
}

export async function createRoutingDomain(input: RoutingDomainInput) {
  const parsed = routingDomainSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    if (parsed.isDefault) {
      await tx.routingDomain.updateMany({
        data: { isDefault: false },
      });
    }

    const created = await tx.routingDomain.create({
      data: {
        domain: parsed.domain,
        label: parsed.label ?? "",
        type: parsed.type,
        enabled: parsed.enabled,
        isDefault: parsed.isDefault,
      },
    });

    return {
      id: created.id,
      domain: created.domain,
      label: created.label,
      type: created.type as "public" | "customer",
      enabled: created.enabled,
      isDefault: created.isDefault,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  });
}

export async function updateRoutingDomain(id: number, input: z.infer<typeof updateRoutingDomainSchema>) {
  const parsed = updateRoutingDomainSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    if (parsed.isDefault) {
      await tx.routingDomain.updateMany({
        where: { id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await tx.routingDomain.update({
      where: { id },
      data: {
        domain: parsed.domain,
        label: parsed.label,
        type: parsed.type,
        enabled: parsed.enabled,
        isDefault: parsed.isDefault,
      },
    });

    return {
      id: updated.id,
      domain: updated.domain,
      label: updated.label,
      type: updated.type as "public" | "customer",
      enabled: updated.enabled,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });
}

export async function deleteRoutingDomain(id: number) {
  await prisma.routingDomain.delete({
    where: { id },
  });
}

function normalizeDomain(value: string) {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim()
    .toLowerCase();
}
