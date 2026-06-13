-- CreateTable
CREATE TABLE "tenant_contacts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "id_number" TEXT,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_contacts_tenant_id_idx" ON "tenant_contacts"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_contacts_tenant_id_deleted_at_idx" ON "tenant_contacts"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_contacts_tenant_id_email_key" ON "tenant_contacts"("tenant_id", "email");

-- AddForeignKey
ALTER TABLE "tenant_contacts" ADD CONSTRAINT "tenant_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
