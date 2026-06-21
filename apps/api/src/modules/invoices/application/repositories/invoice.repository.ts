import { Invoice, InvoiceStatus } from '../../domain/entities/invoice.entity';
import {
  CreateInvoiceInput,
  FindPagedByTenantOptions,
  PagedInvoices,
} from '../types/invoice-repository.types';

/**
 * InvoiceRepository — application-layer interface for Invoice data access.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import from @prisma/client or PrismaService.
 * - Use cases MUST inject this interface via INVOICE_REPOSITORY token.
 * - Controllers MUST NOT inject PrismaInvoiceRepository directly.
 *
 * Tenant-safety rules:
 * - Every method requires tenantId for workspace isolation.
 * - tenantId is supplied from verified request context — NEVER from body/query/header.
 */
export const INVOICE_REPOSITORY = Symbol('INVOICE_REPOSITORY');

export interface InvoiceRepository {
  create(input: CreateInvoiceInput): Promise<Invoice | null>;

  findPagedByTenant(
    tenantId: string,
    options: FindPagedByTenantOptions,
  ): Promise<PagedInvoices>;

  findById(id: string, tenantId: string): Promise<Invoice | null>;

  existsByLeaseAndMonth(
    leaseId: string,
    tenantId: string,
    year: number,
    month: number,
  ): Promise<boolean>;

  updateStatus(
    id: string,
    tenantId: string,
    status: InvoiceStatus,
  ): Promise<Invoice | null>;
}
