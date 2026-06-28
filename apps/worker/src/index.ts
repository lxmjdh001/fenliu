export interface Env {
  ROUTE_KV: KVNamespace;
  TRACK_QUEUE: Queue;
  IP_HASH_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/v\/([a-zA-Z0-9_-]{3,32})$/);

    if (!match) {
      return new Response("Not found", { status: 404 });
    }

    const shortCode = match[1];
    const route = await env.ROUTE_KV.get(`route:${shortCode}`, "json");

    if (!route || typeof route !== "object" || !("serviceKey" in route)) {
      return new Response("Not found", { status: 404 });
    }

    const service = await env.ROUTE_KV.get(String(route.serviceKey), "json");

    if (!service || typeof service !== "object") {
      return new Response("Not found", { status: 404 });
    }

    return Response.json({
      ok: true,
      message: "Worker skeleton is ready. Redirect rules will be implemented next.",
      shortCode,
    });
  },
};
