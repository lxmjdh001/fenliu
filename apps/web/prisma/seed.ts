import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${derived}`;
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@fenliu.local" },
    update: {
      role: "admin",
      membershipLevel: "vip",
      membershipExpiresAt: new Date("2099-12-31T23:59:59.000Z"),
      status: "active",
    },
    create: {
      email: "admin@fenliu.local",
      name: "管理员",
      passwordHash: hashPassword("admin123456"),
      role: "admin",
      membershipLevel: "vip",
      membershipExpiresAt: new Date("2099-12-31T23:59:59.000Z"),
      status: "active",
    },
  });

  await prisma.plan.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "VIP 月度会员",
      priceCents: 0,
      durationDays: 30,
      maxServices: 100,
      maxTargetsPerService: 5000,
      allowIpLock: true,
      allowEdgeBlock: true,
      status: "active",
    },
  });

  await prisma.membership.upsert({
    where: { id: 1 },
    update: {
      userId: admin.id,
      planId: 1,
      expiresAt: new Date("2099-12-31T23:59:59.000Z"),
      status: "active",
    },
    create: {
      id: 1,
      userId: admin.id,
      planId: 1,
      expiresAt: new Date("2099-12-31T23:59:59.000Z"),
      status: "active",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
