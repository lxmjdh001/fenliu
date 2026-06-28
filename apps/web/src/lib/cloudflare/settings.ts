import "server-only";

import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";

const settingsSchema = z.object({
  apiToken: z.string().trim().optional(),
  accountId: z.string().trim().optional(),
  kvNamespaceId: z.string().trim().optional(),
  queueName: z.string().trim().optional(),
  workerName: z.string().trim().optional(),
  workerUrl: z.string().trim().optional(),
  updatedAt: z.string().optional(),
});

export type CloudflareSettings = z.infer<typeof settingsSchema>;

export const saveCloudflareSettingsSchema = z.object({
  apiToken: z.string().trim().optional(),
  accountId: z.string().trim().min(1, "请输入 Account ID").optional().or(z.literal("")),
  kvNamespaceId: z.string().trim().min(1, "请输入 KV Namespace ID").optional().or(z.literal("")),
  queueName: z.string().trim().optional(),
  workerName: z.string().trim().optional(),
  workerUrl: z.string().trim().optional(),
});

const defaultSettings: CloudflareSettings = {
  apiToken: "",
  accountId: "",
  kvNamespaceId: "",
  queueName: "fenliu-track-events-dev",
  workerName: "fenliu-router-dev",
  workerUrl: "https://fenliu-router-dev.lxmjdh.workers.dev",
  updatedAt: "",
};

export async function getCloudflareSettings() {
  try {
    const raw = await readFile(settingsPath(), "utf8");
    return {
      ...defaultSettings,
      ...settingsSchema.parse(JSON.parse(raw)),
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveCloudflareSettings(input: z.infer<typeof saveCloudflareSettingsSchema>) {
  const current = await getCloudflareSettings();
  const parsed = saveCloudflareSettingsSchema.parse(input);
  const next: CloudflareSettings = {
    ...current,
    ...parsed,
    apiToken: parsed.apiToken?.trim() ? parsed.apiToken.trim() : current.apiToken,
    updatedAt: new Date().toISOString(),
  };

  await mkdir(dirname(settingsPath()), { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await chmod(settingsPath(), 0o600);

  return next;
}

export function publicCloudflareSettings(settings: CloudflareSettings) {
  return {
    accountId: settings.accountId ?? "",
    kvNamespaceId: settings.kvNamespaceId ?? "",
    queueName: settings.queueName ?? "",
    workerName: settings.workerName ?? "",
    workerUrl: settings.workerUrl ?? "",
    tokenConfigured: Boolean(settings.apiToken),
    maskedToken: maskToken(settings.apiToken ?? ""),
    updatedAt: settings.updatedAt ?? "",
  };
}

export async function testCloudflareConnection(apiToken?: string) {
  const settings = await getCloudflareSettings();
  const token = apiToken?.trim() || settings.apiToken;

  if (!token) {
    throw new Error("请先填写 Cloudflare API Token");
  }

  const response = await fetch("https://api.cloudflare.com/client/v4/accounts", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.errors?.[0]?.message ?? "Cloudflare 连接失败");
  }

  return payload.result.map((account: { id: string; name: string }) => ({
    id: account.id,
    name: account.name,
  }));
}

function settingsPath() {
  return join(process.env.FENLIU_DATA_DIR ?? join(process.cwd(), ".data"), "cloudflare-settings.json");
}

function maskToken(token: string) {
  if (!token) {
    return "";
  }

  if (token.length <= 12) {
    return `${token.slice(0, 4)}...`;
  }

  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}
