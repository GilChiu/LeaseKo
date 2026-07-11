import { Inject, Injectable } from '@nestjs/common';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '../../../invoices/application/repositories/invoice.repository';
import { InvoiceStatus } from '../../../invoices/domain/entities/invoice.entity';
import { PagedInvoices } from '../../../invoices/application/types/invoice-repository.types';

export interface ListTenantInvoicesUseCaseInput {
  tenantId: string;
  tenantContactId: string;
  page: number;
  limit: number;
  status?: InvoiceStatus;
}

/**
 * ListTenantInvoicesUseCase — paginated list of the signed-in renter's own
 * invoices (tenant portal). US 24.2.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - tenantId AND tenantContactId come from verified request context only.
 */
@Injectable()
export class ListTenantInvoicesUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoices: InvoiceRepository,
  ) {}

  async execute(input: ListTenantInvoicesUseCaseInput): Promise<PagedInvoices> {
    return this.invoices.findPagedByTenantContact(
      input.tenantId,
      input.tenantContactId,
      { page: input.page, limit: input.limit, status: input.status },
    );
  }
}
