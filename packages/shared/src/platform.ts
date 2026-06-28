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

export type WhatsAppEntry = "wa_me" | "api_send";

export const whatsAppEntryLabels: Record<WhatsAppEntry, string> = {
  wa_me: "wa.me",
  api_send: "api.whatsapp.com",
};
