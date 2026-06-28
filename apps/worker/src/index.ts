export interface Env {
  ROUTE_KV: KVNamespace;
  TRACK_QUEUE?: Queue<VisitEvent>;
  IP_HASH_SECRET?: string;
}

type Platform = "whatsapp" | "telegram" | "line";
type AccessRule = "random" | "sequence";
type WhatsAppEntry = "wa_me" | "api_send";
type BlockAction = "not_found" | "redirect";

interface RouteSnapshot {
  version: number;
  platform: Platform;
  shortCode: string;
  serviceKey: string;
}

interface ServiceSnapshot {
  version: number;
  platform: Platform;
  serviceId: number;
  userId: number;
  shortCode: string;
  status: boolean;
  membershipExpiresAt: string;
  accessRule: AccessRule;
  whatsappEntry?: WhatsAppEntry;
  lockIP: boolean;
  ipLockGroupId: string;
  greetingMode: "none" | "single" | "batch";
  globalGreeting: string;
  greetingPool: string[];
  edgeBlock: {
    blockAllEnabled: boolean;
    countryAllowEnabled: boolean;
    allowedCountries: string[];
    countryBlockEnabled: boolean;
    blockedCountries: string[];
    blockChinese: boolean;
    action: BlockAction;
    redirectUrl: string;
  };
  targets: ServiceTarget[];
  updatedAt: string;
}

interface ServiceTarget {
  id: string;
  url: string;
  enabled: boolean;
  remark: string;
  greeting?: string;
}

interface VisitEvent {
  eventId: string;
  platform: Platform;
  shortCode: string;
  serviceId: number;
  targetId: string;
  targetUrl: string;
  ipHash: string;
  ipAddress: string;
  country: string;
  userAgent: string;
  referer: string;
  timestamp: string;
}

const sequenceCounters = new Map<string, number>();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/v\/([a-zA-Z0-9_-]{3,32})$/);

    if (!match) {
      return notFound();
    }

    const shortCode = match[1];
    const route = await env.ROUTE_KV.get<RouteSnapshot>(`route:${shortCode}`, "json");

    if (!route?.serviceKey) {
      return notFound();
    }

    const service = await env.ROUTE_KV.get<ServiceSnapshot>(route.serviceKey, "json");

    if (!service) {
      return notFound();
    }

    const blocked = evaluateBlock(request, service);

    if (blocked) {
      return blocked;
    }

    const targets = service.targets.filter((target) => target.enabled);

    if (!targets.length) {
      return notFound();
    }

    const ipAddress = request.headers.get("CF-Connecting-IP") ?? "";
    const target = await selectTarget(service, targets, ipAddress);
    const redirectUrl = buildRedirectUrl(service, target);
    const event = await buildVisitEvent(request, env, service, target, ipAddress);

    if (env.TRACK_QUEUE) {
      ctx.waitUntil(env.TRACK_QUEUE.send(event));
    }

    return Response.redirect(redirectUrl, 302);
  },
};

function evaluateBlock(request: Request, service: ServiceSnapshot) {
  if (!service.status) {
    return notFound();
  }

  if (service.membershipExpiresAt && Date.now() > Date.parse(service.membershipExpiresAt)) {
    return notFound();
  }

  const block = service.edgeBlock;

  if (block.blockAllEnabled) {
    return blockResponse(block);
  }

  const country = String(request.cf?.country ?? "").toUpperCase();

  if (block.countryAllowEnabled && block.allowedCountries.length) {
    const allowed = block.allowedCountries.map((item) => item.toUpperCase());

    if (!allowed.includes(country)) {
      return blockResponse(block);
    }
  }

  if (block.countryBlockEnabled && block.blockedCountries.length) {
    const blocked = block.blockedCountries.map((item) => item.toUpperCase());

    if (blocked.includes(country)) {
      return blockResponse(block);
    }
  }

  if (block.blockChinese) {
    const language = request.headers.get("Accept-Language")?.toLowerCase() ?? "";

    if (language.includes("zh")) {
      return blockResponse(block);
    }
  }

  return null;
}

function blockResponse(block: ServiceSnapshot["edgeBlock"]) {
  if (block.action === "redirect" && isSafeHttpsUrl(block.redirectUrl)) {
    return Response.redirect(block.redirectUrl, 302);
  }

  return notFound();
}

async function selectTarget(
  service: ServiceSnapshot,
  targets: ServiceTarget[],
  ipAddress: string,
) {
  if (service.lockIP) {
    const hash = await stableHash(`${ipAddress || "unknown"}:${service.ipLockGroupId}`);
    return targets[hash % targets.length];
  }

  if (service.accessRule === "sequence") {
    const current = sequenceCounters.get(service.shortCode) ?? 0;
    sequenceCounters.set(service.shortCode, current + 1);
    return targets[current % targets.length];
  }

  return targets[Math.floor(Math.random() * targets.length)];
}

function buildRedirectUrl(service: ServiceSnapshot, target: ServiceTarget) {
  const greeting = target.greeting || pickGreeting(service);

  if (service.platform === "whatsapp") {
    if (isSafeHttpsUrl(target.url)) {
      const url = new URL(target.url);

      if (greeting && !url.searchParams.has("text")) {
        url.searchParams.set("text", greeting);
      }

      if (isWhatsAppApiSendUrl(url)) {
        url.searchParams.set("type", url.searchParams.get("type") || "business_profile");
        url.searchParams.set("app_absent", url.searchParams.get("app_absent") || "0");
      }

      return url.toString();
    }

    return buildWhatsAppUrl(target.url, greeting, service.whatsappEntry ?? "wa_me");
  }

  if (service.platform === "telegram") {
    if (isSafeHttpsUrl(target.url)) {
      return target.url;
    }

    return `https://t.me/${target.url.replace(/^@/, "")}`;
  }

  if (isSafeHttpsUrl(target.url)) {
    return target.url;
  }

  return `https://line.me/ti/p/${target.url.replace(/^@/, "")}`;
}

function pickGreeting(service: ServiceSnapshot) {
  if (service.globalGreeting) {
    return service.globalGreeting;
  }

  if (service.greetingPool.length) {
    return service.greetingPool[Math.floor(Math.random() * service.greetingPool.length)];
  }

  return "";
}

function buildWhatsAppUrl(phoneInput: string, greeting: string, entry: WhatsAppEntry) {
  const phone = phoneInput.replace(/\D/g, "");

  if (entry === "api_send") {
    const url = new URL("https://api.whatsapp.com/send/");
    url.searchParams.set("phone", phone);

    if (greeting) {
      url.searchParams.set("text", greeting);
    }

    url.searchParams.set("type", "business_profile");
    url.searchParams.set("app_absent", "0");
    return url.toString();
  }

  const url = new URL(`https://wa.me/${phone}`);

  if (greeting) {
    url.searchParams.set("text", greeting);
  }

  return url.toString();
}

function isWhatsAppApiSendUrl(url: URL) {
  return url.hostname.toLowerCase() === "api.whatsapp.com" && url.pathname.startsWith("/send");
}

async function buildVisitEvent(
  request: Request,
  env: Env,
  service: ServiceSnapshot,
  target: ServiceTarget,
  ipAddress: string,
): Promise<VisitEvent> {
  const now = new Date().toISOString();

  return {
    eventId: crypto.randomUUID(),
    platform: service.platform,
    shortCode: service.shortCode,
    serviceId: service.serviceId,
    targetId: target.id,
    targetUrl: target.url,
    ipHash: await digestHex(`${ipAddress}:${env.IP_HASH_SECRET ?? "fenliu"}`),
    ipAddress,
    country: String(request.cf?.country ?? ""),
    userAgent: request.headers.get("User-Agent") ?? "",
    referer: request.headers.get("Referer") ?? "",
    timestamp: now,
  };
}

async function stableHash(input: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const view = new DataView(hash);
  return view.getUint32(0);
}

async function digestHex(input: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isSafeHttpsUrl(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
