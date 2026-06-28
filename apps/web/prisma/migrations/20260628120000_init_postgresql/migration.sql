-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "MembershipLevel" AS ENUM ('free', 'vip');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'banned');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('whatsapp', 'telegram', 'line');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('enabled', 'paused', 'expired');

-- CreateEnum
CREATE TYPE "AccessRule" AS ENUM ('random', 'sequence');

-- CreateEnum
CREATE TYPE "WhatsAppEntry" AS ENUM ('wa_me', 'api_send');

-- CreateEnum
CREATE TYPE "GreetingMode" AS ENUM ('none', 'single', 'batch');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('success', 'pending', 'failed');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "SnapshotStatus" AS ENUM ('success', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'member',
    "membership_level" "MembershipLevel" NOT NULL DEFAULT 'free',
    "membership_expires_at" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL DEFAULT 0,
    "duration_days" INTEGER NOT NULL DEFAULT 30,
    "max_services" INTEGER NOT NULL DEFAULT 10,
    "max_targets_per_service" INTEGER NOT NULL DEFAULT 5000,
    "allow_ip_lock" BOOLEAN NOT NULL DEFAULT true,
    "allow_edge_block" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_id" INTEGER,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_id" INTEGER,
    "amount_cents" INTEGER NOT NULL DEFAULT 0,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT '',
    "provider_order_id" TEXT NOT NULL DEFAULT '',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "short_code" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'enabled',
    "access_rule" "AccessRule" NOT NULL DEFAULT 'random',
    "whatsapp_entry" "WhatsAppEntry" NOT NULL DEFAULT 'wa_me',
    "lock_ip" BOOLEAN NOT NULL DEFAULT false,
    "ip_lock_group_id" TEXT NOT NULL,
    "greeting_mode" "GreetingMode" NOT NULL DEFAULT 'none',
    "global_greeting" TEXT NOT NULL DEFAULT '',
    "greeting_pool" JSONB NOT NULL DEFAULT '[]',
    "edge_block" JSONB NOT NULL,
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'pending',
    "publish_error" TEXT NOT NULL DEFAULT '',
    "published_at" TIMESTAMP(3),
    "membership_expires_at" TIMESTAMP(3),
    "today_pv" INTEGER NOT NULL DEFAULT 0,
    "today_uv" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_targets" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "target_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "normalized_url" TEXT NOT NULL,
    "remark" TEXT NOT NULL DEFAULT '',
    "greeting" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_snapshots" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "route_key" TEXT NOT NULL,
    "service_key" TEXT NOT NULL,
    "route_snapshot_json" JSONB NOT NULL,
    "service_snapshot_json" JSONB NOT NULL,
    "status" "SnapshotStatus" NOT NULL DEFAULT 'success',
    "error" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE INDEX "memberships_expires_at_idx" ON "memberships"("expires_at");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "services_short_code_key" ON "services"("short_code");

-- CreateIndex
CREATE INDEX "services_user_id_idx" ON "services"("user_id");

-- CreateIndex
CREATE INDEX "services_platform_idx" ON "services"("platform");

-- CreateIndex
CREATE INDEX "services_updated_at_idx" ON "services"("updated_at");

-- CreateIndex
CREATE INDEX "service_targets_service_id_sort_order_idx" ON "service_targets"("service_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "service_targets_service_id_target_key_key" ON "service_targets"("service_id", "target_key");

-- CreateIndex
CREATE INDEX "publish_snapshots_service_id_idx" ON "publish_snapshots"("service_id");

-- CreateIndex
CREATE INDEX "publish_snapshots_created_at_idx" ON "publish_snapshots"("created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_targets" ADD CONSTRAINT "service_targets_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_snapshots" ADD CONSTRAINT "publish_snapshots_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

