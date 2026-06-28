import { UsersTable } from "@/components/admin/users-table";
import { listUsers } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">用户管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理用户权限、VIP 会员状态和账号封禁状态。
        </p>
      </div>
      <UsersTable initialUsers={users} />
    </div>
  );
}
