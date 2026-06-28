import { CloudflareSettingsForm } from "@/components/admin/cloudflare-settings-form";
import { getCloudflareSettings, publicCloudflareSettings } from "@/lib/cloudflare/settings";

export const dynamic = "force-dynamic";

export default async function AdminCloudflarePage() {
  const settings = await getCloudflareSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Cloudflare 配置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          仅管理员可见。配置 API Token、账号、KV、Queue 和 Worker，用于后续发布服务快照。
        </p>
      </div>
      <CloudflareSettingsForm initialSettings={publicCloudflareSettings(settings)} />
    </div>
  );
}
