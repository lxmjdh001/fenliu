export type ServiceStatus = "enabled" | "paused" | "expired";
export type PublishStatus = "success" | "pending" | "failed";
export type Platform = "whatsapp" | "telegram" | "line";
export type AccessRule = "random" | "sequence";

export interface ServiceTarget {
  id: string;
  targetKey: string;
  url: string;
  normalizedUrl: string;
  remark: string;
  greeting: string;
  enabled: boolean;
}

export interface EdgeBlockConfig {
  blockAllEnabled: boolean;
  countryAllowEnabled: boolean;
  allowedCountries: string[];
  countryBlockEnabled: boolean;
  blockedCountries: string[];
  blockChinese: boolean;
  ipBlockListIds: string[];
  action: "not_found" | "redirect";
  redirectUrl: string;
}

export interface ServiceRecord {
  id: string;
  userId: number;
  name: string;
  platform: Platform;
  shortCode: string;
  domain: string;
  status: ServiceStatus;
  accessRule: AccessRule;
  lockIP: boolean;
  ipLockGroupId: string;
  greetingMode: "none" | "single" | "batch";
  globalGreeting: string;
  greetingPool: string[];
  targets: ServiceTarget[];
  edgeBlock: EdgeBlockConfig;
  publishStatus: PublishStatus;
  publishError: string;
  publishedAt: string;
  membershipExpiresAt: string;
  todayPv: number;
  todayUv: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRow {
  id: string;
  name: string;
  platform: Platform;
  shortCode: string;
  domain: string;
  accessRule: AccessRule;
  lockIP: boolean;
  targets: number;
  todayPv: number;
  todayUv: number;
  status: ServiceStatus;
  publishStatus: PublishStatus;
  updatedAt: string;
}

export interface CreateServiceInput {
  name: string;
  platform: Platform;
  domain: string;
  accessRule: AccessRule;
  lockIP?: boolean;
  greeting?: string;
  targets: Array<{
    remark?: string;
    url: string;
  }>;
}
