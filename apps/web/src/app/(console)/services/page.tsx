import { ServicesTable } from "@/components/services/services-table";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listRoutingDomains } from "@/lib/domains/store";
import { listServiceRows } from "@/lib/services/store";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const user = await getCurrentUser();
  const services = await listServiceRows(user);
  const routingDomains = await listRoutingDomains({ enabledOnly: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">分流服务</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          创建和发布 WhatsApp / Telegram / Line 分流链接，配置账号、拦截和访问规则。
        </p>
      </div>
      <ServicesTable data={services} routingDomains={routingDomains} />
    </div>
  );
}
