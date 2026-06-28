import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function BillingPage() {
  return (
    <PlaceholderPage
      title="套餐订单"
      description="管理会员套餐、到期时间和功能权限。"
      items={["当前套餐", "订单记录", "服务数量限制", "高级功能权限"]}
    />
  );
}
