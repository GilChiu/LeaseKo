import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { PAYMENT_REPOSITORY } from './application/repositories/payment.repository';
import { RecordPaymentUseCase } from './application/use-cases/record-payment.use-case';
import { ListPaymentsUseCase } from './application/use-cases/list-payments.use-case';
import { PrismaPaymentRepository } from './infrastructure/repositories/prisma-payment.repository';
import { PaymentsController } from './presentation/payments.controller';

@Module({
  imports: [InvoicesModule],
  controllers: [PaymentsController],
  providers: [
    {
      provide: PAYMENT_REPOSITORY,
      useClass: PrismaPaymentRepository,
    },
    RecordPaymentUseCase,
    ListPaymentsUseCase,
  ],
  exports: [PAYMENT_REPOSITORY],
})
export class PaymentsModule {}
