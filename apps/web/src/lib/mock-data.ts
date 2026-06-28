import type { AccessRule, Platform, WhatsAppEntry } from "@/lib/services/types";

export const trafficTrend = [
  { date: "06-22", pv: 4200, uv: 1720 },
  { date: "06-23", pv: 5380, uv: 2190 },
  { date: "06-24", pv: 6120, uv: 2640 },
  { date: "06-25", pv: 5840, uv: 2380 },
  { date: "06-26", pv: 7310, uv: 3080 },
  { date: "06-27", pv: 8090, uv: 3310 },
  { date: "06-28", pv: 7677, uv: 2732 },
];

export const platformLabels: Record<Platform, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  line: "Line",
};

export const accessRuleLabels: Record<AccessRule, string> = {
  random: "随机",
  sequence: "顺序",
};

export const whatsAppEntryLabels: Record<WhatsAppEntry, string> = {
  wa_me: "wa.me",
  api_send: "api.whatsapp.com",
};
