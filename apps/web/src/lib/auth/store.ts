import "server-only";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { User } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

import { hashPassword, verifyPassword } from "./password";
import type { CurrentUser, MembershipLevel, SessionRecord, UserRecord, UserRole, UserStatus } from "./types";

const registerSchema = z.object({
  email: z.string().trim().email("请输入正确邮箱"),
  password: z.string().min(6, "密码至少 6 位").max(80, "密码过长"),
  name: z.string().trim().min(1, "请输入名称").max(40, "名称最多 40 个字符"),
});

const loginSchema = z.object({
  email: z.string().trim().email("请输入正确邮箱"),
  password: z.string().min(1, "请输入密码"),
});

export const updateUserSchema = z.object({
  role: z.enum(["admin", "member"]).optional(),
  membershipLevel: z.enum(["free", "vip"]).optional(),
  membershipExpiresAt: z.string().optional(),
  status: z.enum(["active", "banned"]).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export async function ensureAuthSeed() {
  const existing = await prisma.user.findUnique({
    where: { email: "admin@fenliu.local" },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  await prisma.user.create({
    data: {
      email: "admin@fenliu.local",
      name: "管理员",
      passwordHash: await hashPassword("admin123456"),
      role: "admin",
      membershipLevel: "vip",
      membershipExpiresAt: new Date("2099-12-31T23:59:59.000Z"),
      status: "active",
    },
  });
}

export async function registerUser(input: RegisterInput) {
  const parsed = registerSchema.parse(input);
  const email = parsed.email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw new Error("邮箱已注册");
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.name,
      passwordHash: await hashPassword(parsed.password),
      role: "member",
      membershipLevel: "free",
      membershipExpiresAt: null,
      status: "active",
    },
  });

  return toCurrentUser(user);
}

export async function loginUser(input: LoginInput) {
  const parsed = loginSchema.parse(input);
  const user = await prisma.user.findUnique({
    where: { email: parsed.email.toLowerCase() },
  });

  if (!user || !(await verifyPassword(parsed.password, user.passwordHash))) {
    throw new Error("邮箱或密码错误");
  }

  if (user.status !== "active") {
    throw new Error("账号已被禁用");
  }

  const session = await createSession(user.id);

  return {
    user: toCurrentUser(user),
    session,
  };
}

export async function createSession(userId: number): Promise<SessionRecord> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  const session = await prisma.session.create({
    data: {
      token: randomBytes(32).toString("hex"),
      userId,
      expiresAt,
    },
  });

  return {
    token: session.token,
    userId: session.userId,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

export async function getUserBySessionToken(token?: string) {
  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt.getTime() < Date.now() || session.user.status !== "active") {
    return null;
  }

  return toCurrentUser(session.user);
}

export async function deleteSession(token?: string) {
  if (!token) {
    return;
  }

  await prisma.session.deleteMany({
    where: { token },
  });
}

export async function listUsers() {
  await ensureAuthSeed();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return users.map(sanitizeUser);
}

export async function updateUser(id: number, input: z.infer<typeof updateUserSchema>) {
  const parsed = updateUserSchema.parse(input);
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!user) {
    throw new Error("用户不存在");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      role: parsed.role,
      membershipLevel: parsed.membershipLevel,
      membershipExpiresAt:
        typeof parsed.membershipExpiresAt === "string" && parsed.membershipExpiresAt
          ? new Date(parsed.membershipExpiresAt)
          : typeof parsed.membershipExpiresAt === "string"
            ? null
            : undefined,
      status: parsed.status,
    },
  });

  return sanitizeUser(updated);
}

export function toCurrentUser(user: User): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    membershipLevel: user.membershipLevel as MembershipLevel,
    membershipExpiresAt: user.membershipExpiresAt?.toISOString() ?? "",
    status: user.status as UserStatus,
  };
}

function sanitizeUser(user: User): Omit<UserRecord, "passwordHash"> {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    membershipLevel: user.membershipLevel as MembershipLevel,
    membershipExpiresAt: user.membershipExpiresAt?.toISOString() ?? "",
    status: user.status as UserStatus,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
