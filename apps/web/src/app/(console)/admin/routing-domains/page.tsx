import { RoutingDomainsForm } from "@/components/admin/routing-domains-form";
import { listRoutingDomains } from "@/lib/domains/store";

export const dynamic = "force-dynamic";

export default async function AdminRoutingDomainsPage() {
  const domains = await listRoutingDomains();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">分流域名</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          配置 Cloudflare Worker 实际承接 /v/短码 的域名，用于复制链接和后续发布路由。
        </p>
      </div>
      <RoutingDomainsForm initialDomains={domains} />
    </div>
  );
}
