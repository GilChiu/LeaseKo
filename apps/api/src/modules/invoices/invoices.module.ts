import { Module } from '@nestjs/common';
import { LeasesModule } from '../leases/leases.module';
import { INVOICE_REPOSITORY } from './application/repositories/invoice.repository';
import { CreateInvoiceUseCase } from './application/use-cases/create-invoice.use-case';
import { GenerateRecurringInvoicesUseCase } from './application/use-cases/generate-recurring-invoices.use-case';
import { GetInvoiceByIdUseCase } from './application/use-cases/get-invoice-by-id.use-case';
import { ListInvoicesUseCase } from './application/use-cases/list-invoices.use-case';
import { PrismaInvoiceRepository } from './infrastructure/repositories/prisma-invoice.repository';
import { InvoicesController } from './presentation/invoices.controller';

@Module({
  imports: [LeasesModule],
  controllers: [InvoicesController],
  providers: [
    {
      provide: INVOICE_REPOSITORY,
      useClass: PrismaInvoiceRepository,
    },
    CreateInvoiceUseCase,
    ListInvoicesUseCase,
    GetInvoiceByIdUseCase,
    GenerateRecurringInvoicesUseCase,
  ],
  exports: [INVOICE_REPOSITORY],
})
export class InvoicesModule {}
