import "server-only";

export type UserRole = "admin" | "user" | "staff";

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export function getCurrentUser(): CurrentUser {
  return {
    id: 1,
    name: "管理员",
    email: "admin@fenliu.local",
    role: "admin",
  };
}

export function isAdmin(user = getCurrentUser()) {
  return user.role === "admin";
}

export function requireAdmin() {
  const user = getCurrentUser();

  if (!isAdmin(user)) {
    throw new Error("仅管理员可操作");
  }

  return user;
}
