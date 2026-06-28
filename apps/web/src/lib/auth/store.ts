import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";

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

interface UsersFile {
  nextId: number;
  users: UserRecord[];
}

interface SessionsFile {
  sessions: SessionRecord[];
}

export async function ensureAuthSeed() {
  const usersFile = await readUsersFile();

  if (usersFile.users.length) {
    return;
  }

  const now = new Date().toISOString();
  usersFile.users.push({
    id: 1,
    email: "admin@fenliu.local",
    name: "管理员",
    passwordHash: await hashPassword("admin123456"),
    role: "admin",
    membershipLevel: "vip",
    membershipExpiresAt: "2099-12-31T23:59:59.000Z",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  usersFile.nextId = 2;

  await writeUsersFile(usersFile);
}

export async function registerUser(input: RegisterInput) {
  const parsed = registerSchema.parse(input);
  const usersFile = await readUsersFile();
  const email = parsed.email.toLowerCase();

  if (usersFile.users.some((user) => user.email.toLowerCase() === email)) {
    throw new Error("邮箱已注册");
  }

  const now = new Date().toISOString();
  const user: UserRecord = {
    id: usersFile.nextId++,
    email,
    name: parsed.name,
    passwordHash: await hashPassword(parsed.password),
    role: "member",
    membershipLevel: "free",
    membershipExpiresAt: "",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  usersFile.users.push(user);
  await writeUsersFile(usersFile);

  return toCurrentUser(user);
}

export async function loginUser(input: LoginInput) {
  const parsed = loginSchema.parse(input);
  const usersFile = await readUsersFile();
  const user = usersFile.users.find((item) => item.email.toLowerCase() === parsed.email.toLowerCase());

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

export async function createSession(userId: number) {
  const sessionsFile = await readSessionsFile();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);
  const session: SessionRecord = {
    token: randomBytes(32).toString("hex"),
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  sessionsFile.sessions = [
    ...sessionsFile.sessions.filter((item) => Date.parse(item.expiresAt) > Date.now()),
    session,
  ];
  await writeSessionsFile(sessionsFile);

  return session;
}

export async function getUserBySessionToken(token?: string) {
  if (!token) {
    return null;
  }

  const sessionsFile = await readSessionsFile();
  const session = sessionsFile.sessions.find((item) => item.token === token);

  if (!session || Date.parse(session.expiresAt) < Date.now()) {
    return null;
  }

  const usersFile = await readUsersFile();
  const user = usersFile.users.find((item) => item.id === session.userId);

  if (!user || user.status !== "active") {
    return null;
  }

  return toCurrentUser(user);
}

export async function deleteSession(token?: string) {
  if (!token) {
    return;
  }

  const sessionsFile = await readSessionsFile();
  sessionsFile.sessions = sessionsFile.sessions.filter((item) => item.token !== token);
  await writeSessionsFile(sessionsFile);
}

export async function listUsers() {
  await ensureAuthSeed();
  const usersFile = await readUsersFile();

  return usersFile.users
    .map((user) => sanitizeUser(user))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateUser(id: number, input: z.infer<typeof updateUserSchema>) {
  const parsed = updateUserSchema.parse(input);
  const usersFile = await readUsersFile();
  const user = usersFile.users.find((item) => item.id === id);

  if (!user) {
    throw new Error("用户不存在");
  }

  if (parsed.role) user.role = parsed.role as UserRole;
  if (parsed.membershipLevel) user.membershipLevel = parsed.membershipLevel as MembershipLevel;
  if (typeof parsed.membershipExpiresAt === "string") user.membershipExpiresAt = parsed.membershipExpiresAt;
  if (parsed.status) user.status = parsed.status as UserStatus;
  user.updatedAt = new Date().toISOString();

  await writeUsersFile(usersFile);

  return sanitizeUser(user);
}

export function toCurrentUser(user: UserRecord): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    membershipLevel: user.membershipLevel,
    membershipExpiresAt: user.membershipExpiresAt,
    status: user.status,
  };
}

function sanitizeUser(user: UserRecord) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

async function readUsersFile(): Promise<UsersFile> {
  await mkdir(dataDir(), { recursive: true });

  try {
    const raw = await readFile(usersPath(), "utf8");
    const parsed = JSON.parse(raw) as UsersFile;
    return {
      nextId: parsed.nextId || 1,
      users: parsed.users || [],
    };
  } catch {
    return {
      nextId: 1,
      users: [],
    };
  }
}

async function writeUsersFile(data: UsersFile) {
  await mkdir(dirname(usersPath()), { recursive: true });
  await writeFile(usersPath(), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readSessionsFile(): Promise<SessionsFile> {
  await mkdir(dataDir(), { recursive: true });

  try {
    const raw = await readFile(sessionsPath(), "utf8");
    const parsed = JSON.parse(raw) as SessionsFile;
    return {
      sessions: parsed.sessions || [],
    };
  } catch {
    return {
      sessions: [],
    };
  }
}

async function writeSessionsFile(data: SessionsFile) {
  await mkdir(dirname(sessionsPath()), { recursive: true });
  await writeFile(sessionsPath(), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function dataDir() {
  return process.env.FENLIU_DATA_DIR ?? join(process.cwd(), ".data");
}

function usersPath() {
  return join(dataDir(), "users.json");
}

function sessionsPath() {
  return join(dataDir(), "sessions.json");
}
