import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function AdminCloudflarePage() {
  return (
    <PlaceholderPage
      title="CF 状态"
      description="检测 KV、Queue、Worker、Custom Hostnames 和发布日志。"
      items={["KV 发布日志", "Queue 积压监控", "Worker 版本", "Custom Hostname pending"]}
    />
  );
}
