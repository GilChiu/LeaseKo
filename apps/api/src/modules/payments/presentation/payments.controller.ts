import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequiresTenant } from '../../../common/decorators/requires-tenant.decorator';
import { ErrorResponseDto } from '../../../shared/dto/error-response.dto';
import { RecordPaymentUseCase } from '../application/use-cases/record-payment.use-case';
import { ListPaymentsUseCase } from '../application/use-cases/list-payments.use-case';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaginatedPaymentsResponseDto } from './dto/paginated-payments-response.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly recordPayment: RecordPaymentUseCase,
    private readonly listPayments: ListPaymentsUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'List all payments for the current workspace' })
  @ApiOkResponse({
    description: 'Paginated payment list.',
    type: PaginatedPaymentsResponseDto,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'invoiceId',
    required: false,
    type: String,
    description: 'Filter by invoice ID',
  })
  @ApiQuery({
    name: 'method',
    required: false,
    enum: ['CASH', 'BANK_TRANSFER', 'GCASH', 'MAYA', 'CHECK', 'OTHER'],
    description: 'Filter by payment method',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    description: 'Filter by payment status',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Invalid query parameters.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing or invalid Bearer token.',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Authenticated but no active organization/tenant context.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Unexpected server error.',
  })
  async list(
    @CurrentTenant() tenantId: string,
    @Query() query: ListPaymentsQueryDto,
  ): Promise<PaginatedPaymentsResponseDto> {
    const result = await this.listPayments.execute({
      tenantId,
      page: query.page,
      limit: query.limit,
      invoiceId: query.invoiceId,
      method: query.method,
      status: query.status,
    });
    return PaginatedPaymentsResponseDto.fromDomain(
      result,
      query.page,
      query.limit,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresTenant()
  @ApiOperation({ summary: 'Record a payment for an invoice' })
  @ApiCreatedResponse({
    description: 'Payment recorded successfully.',
    type: PaymentResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'Validation error, overpayment, or invalid invoice status.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Invoice not found or not accessible.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing or invalid Bearer token.',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Authenticated but no active organization/tenant context.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Unexpected server error.',
  })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordPaymentDto,
  ): Promise<PaymentResponseDto> {
    const payment = await this.recordPayment.execute({
      tenantId,
      invoiceId: dto.invoiceId,
      amount: dto.amount,
      method: dto.method,
      recordedAt: new Date(dto.recordedAt),
      notes: dto.notes ?? null,
    });
    return PaymentResponseDto.fromDomain(payment);
  }
}
