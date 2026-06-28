import { ServiceForm } from "@/components/services/service-form";

export default function NewServicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">新建分流服务</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          先保存服务配置，随后由后端生成 KV 快照并发布到 Cloudflare Worker。
        </p>
      </div>
      <ServiceForm />
    </div>
  );
}
