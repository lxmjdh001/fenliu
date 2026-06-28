export const platforms = ["whatsapp", "telegram", "line"] as const;

export type Platform = (typeof platforms)[number];

export const platformLabels: Record<Platform, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  line: "Line",
};

export type AccessRule = "random" | "sequence";

export const accessRuleLabels: Record<AccessRule, string> = {
  random: "随机",
  sequence: "顺序",
};
