export const platforms = ["whatsapp", "telegram", "line"] as const;

export type Platform = (typeof platforms)[number];

export const platformLabels: Record<Platform, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  line: "Line",
};

export type AccessRule = "random" | "sequence" | "ip_lock";

export const accessRuleLabels: Record<AccessRule, string> = {
  random: "随机",
  sequence: "顺序",
  ip_lock: "IP 锁定",
};
