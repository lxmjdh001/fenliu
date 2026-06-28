import type { ServiceRecord } from "./types";

export function buildRouteSnapshot(service: ServiceRecord) {
  return {
    version: 1,
    platform: service.platform,
    shortCode: service.shortCode,
    serviceKey: `service:${service.platform}:${service.shortCode}`,
  };
}

export function buildServiceSnapshot(service: ServiceRecord) {
  return {
    version: 1,
    platform: service.platform,
    serviceId: Number(service.id),
    userId: service.userId,
    shortCode: service.shortCode,
    status: service.status === "enabled",
    membershipExpiresAt: service.membershipExpiresAt,
    redirectType: "account",
    accessRule: service.accessRule,
    lockIP: service.lockIP,
    ipLockGroupId: service.ipLockGroupId,
    greetingMode: service.greetingMode,
    globalGreeting: service.globalGreeting,
    greetingPool: service.greetingPool,
    edgeBlock: service.edgeBlock,
    targets: service.targets.map((target) => ({
      id: target.targetKey,
      url: target.normalizedUrl,
      enabled: target.enabled,
      remark: target.remark,
      greeting: target.greeting,
      workOrderIds: [],
    })),
    updatedAt: service.updatedAt,
  };
}
