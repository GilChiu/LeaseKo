-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'VOID');

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "tenant_contact_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoices_tenant_id_idx" ON "invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_deleted_at_idx" ON "invoices"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "invoices_lease_id_idx" ON "invoices"("lease_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_contact_id_idx" ON "invoices"("tenant_contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenant_id_invoice_number_key" ON "invoices"("tenant_id", "invoice_number");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_contact_id_fkey" FOREIGN KEY ("tenant_contact_id") REFERENCES "tenant_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
