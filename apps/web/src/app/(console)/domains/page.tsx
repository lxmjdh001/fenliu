import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function DomainsPage() {
  return (
    <PlaceholderPage
      title="域名管理"
      description="管理公共域名、自定义子域名和 Cloudflare Custom Hostname 状态。"
      items={["公共域名池", "客户自定义子域名", "CNAME 指引", "验证状态检测"]}
    />
  );
}
