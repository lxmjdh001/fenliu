import type { Platform } from "./types";

const whatsappHosts = new Set(["wa.me", "whatsapp.com", "www.whatsapp.com", "api.whatsapp.com"]);
const telegramHosts = new Set(["t.me", "telegram.me", "www.t.me", "www.telegram.me"]);

export function normalizeTarget(platform: Platform, input: string) {
  const value = input.trim();

  if (!value) {
    throw new Error("账号不能为空");
  }

  if (platform === "whatsapp") {
    return normalizeWhatsApp(value);
  }

  if (platform === "telegram") {
    return normalizeTelegram(value);
  }

  return normalizeLine(value);
}

function normalizeWhatsApp(input: string) {
  if (isHttpUrl(input)) {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();

    if (!whatsappHosts.has(hostname) && !hostname.endsWith(".whatsapp.com")) {
      throw new Error("WhatsApp 链接只允许 wa.me 或 whatsapp.com");
    }

    const phone = extractDigits(url.pathname);

    if (!phone) {
      throw new Error("WhatsApp 链接里没有可用手机号");
    }

    return phone;
  }

  const normalized = input.replace(/[\s()-]/g, "");

  if (!/^\+?\d{6,18}$/.test(normalized)) {
    throw new Error("WhatsApp 账号必须是手机号或合法 WhatsApp 链接");
  }

  return normalized.replace(/^\+/, "");
}

function normalizeTelegram(input: string) {
  if (isHttpUrl(input)) {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();

    if (!telegramHosts.has(hostname)) {
      throw new Error("Telegram 链接只允许 t.me 或 telegram.me");
    }

    return input;
  }

  return input.replace(/^@/, "").trim();
}

function normalizeLine(input: string) {
  if (isHttpUrl(input)) {
    const url = new URL(input);

    if (url.protocol !== "https:") {
      throw new Error("Line 外部链接必须使用 https");
    }

    return input;
  }

  return input.replace(/^@/, "").trim();
}

function isHttpUrl(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function extractDigits(input: string) {
  return input.replace(/\D/g, "");
}
