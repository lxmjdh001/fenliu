import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function AdminUsersPage() {
  return (
    <PlaceholderPage
      title="用户管理"
      description="管理员查看用户、会员状态、封禁状态和服务数量。"
      items={["用户列表", "套餐调整", "封禁 / 解封", "服务归属排查"]}
    />
  );
}
