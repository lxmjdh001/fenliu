-- CreateTable
CREATE TABLE "routing_domains" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'public',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "routing_domains_domain_key" ON "routing_domains"("domain");

-- CreateIndex
CREATE INDEX "routing_domains_enabled_idx" ON "routing_domains"("enabled");

-- CreateIndex
CREATE INDEX "routing_domains_is_default_idx" ON "routing_domains"("is_default");
