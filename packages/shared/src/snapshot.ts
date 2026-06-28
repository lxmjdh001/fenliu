import type { AccessRule, Platform } from "./platform";

export type EdgeBlockAction = "not_found" | "redirect";

export interface ServiceTargetSnapshot {
  id: string;
  url: string;
  enabled: boolean;
  remark: string;
  greeting?: string;
  workOrderIds?: number[];
}

export interface EdgeBlockSnapshot {
  blockAllEnabled: boolean;
  countryAllowEnabled: boolean;
  allowedCountries: string[];
  countryBlockEnabled: boolean;
  blockedCountries: string[];
  blockChinese: boolean;
  ipBlockListIds: string[];
  action: EdgeBlockAction;
  redirectUrl: string;
}

export interface RouteSnapshot {
  version: number;
  platform: Platform;
  shortCode: string;
  serviceKey: string;
}

export interface ServiceSnapshot {
  version: number;
  platform: Platform;
  serviceId: number;
  userId: number;
  shortCode: string;
  status: boolean;
  membershipExpiresAt: string;
  redirectType: string;
  accessRule: AccessRule;
  lockIP: boolean;
  ipLockGroupId: string;
  greetingMode: "none" | "single" | "batch";
  globalGreeting: string;
  greetingPool: string[];
  edgeBlock: EdgeBlockSnapshot;
  targets: ServiceTargetSnapshot[];
  updatedAt: string;
}
