import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function AdminSecurityPage() {
  return (
    <PlaceholderPage
      title="拦截策略"
      description="维护国家拦截、中文浏览器拦截和 IP 黑名单配置。"
      items={["国家允许 / 拦截", "中文浏览器拦截", "IP 黑名单", "拦截事件分析"]}
    />
  );
}
