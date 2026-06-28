import "server-only";

import { cookies } from "next/headers";

import { ensureAuthSeed, getUserBySessionToken } from "./store";
import type { CurrentUser } from "./types";

export const sessionCookieName = "fenliu_session";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  await ensureAuthSeed();
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  return getUserBySessionToken(token);
}

export function isAdmin(user: CurrentUser | null) {
  return user?.role === "admin";
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("请先登录");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (!isAdmin(user)) {
    throw new Error("仅管理员可操作");
  }

  return user;
}
