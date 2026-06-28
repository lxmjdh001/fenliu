import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ServiceForm } from "@/components/services/service-form";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getService } from "@/lib/services/store";

export const dynamic = "force-dynamic";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const service = await getService(id, user);

  if (!service) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild className="-ml-3">
          <Link href="/services">
            <ArrowLeft className="size-4" />
            返回服务列表
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>服务不存在</CardTitle>
            <CardDescription>请返回服务列表重新选择。</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="-ml-3">
        <Link href={`/services/${service.id}`}>
          <ArrowLeft className="size-4" />
          返回服务详情
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">编辑分流服务</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          修改基础设置、账号列表和分流规则，保存后需要重新发布。
        </p>
      </div>
      <ServiceForm service={service} />
    </div>
  );
}
