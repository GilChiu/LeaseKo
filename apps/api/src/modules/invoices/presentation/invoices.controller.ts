import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequiresTenant } from '../../../common/decorators/requires-tenant.decorator';
import { ErrorResponseDto } from '../../../shared/dto/error-response.dto';
import { CreateInvoiceUseCase } from '../application/use-cases/create-invoice.use-case';
import { GetInvoiceByIdUseCase } from '../application/use-cases/get-invoice-by-id.use-case';
import { ListInvoicesUseCase } from '../application/use-cases/list-invoices.use-case';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { PaginatedInvoicesResponseDto } from './dto/paginated-invoices-response.dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly createInvoice: CreateInvoiceUseCase,
    private readonly listInvoices: ListInvoicesUseCase,
    private readonly getInvoiceById: GetInvoiceByIdUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'List all invoices for the current workspace' })
  @ApiOkResponse({
    description: 'Paginated invoice list.',
    type: PaginatedInvoicesResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'VOID'],
    description: 'Filter by invoice status',
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
    @Query() query: ListInvoicesQueryDto,
  ): Promise<PaginatedInvoicesResponseDto> {
    const result = await this.listInvoices.execute({
      tenantId,
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
    return PaginatedInvoicesResponseDto.fromDomain(result, query.page, query.limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'Get an invoice by ID' })
  @ApiParam({ name: 'id', description: 'Invoice unique identifier' })
  @ApiOkResponse({
    description: 'Invoice found.',
    type: InvoiceResponseDto,
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
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.getInvoiceById.execute({ id, tenantId });
    return InvoiceResponseDto.fromDomain(invoice);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresTenant()
  @ApiOperation({ summary: 'Create an invoice for the current workspace' })
  @ApiCreatedResponse({
    description: 'Invoice created successfully.',
    type: InvoiceResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Validation error or lease is not active.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Lease not found or not accessible.',
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
    @Body() dto: CreateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.createInvoice.execute({
      tenantId,
      leaseId: dto.leaseId,
      dueDate: new Date(dto.dueDate),
      amount: dto.amount,
      notes: dto.notes ?? null,
    });
    return InvoiceResponseDto.fromDomain(invoice);
  }
}
