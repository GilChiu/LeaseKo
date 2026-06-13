import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequiresTenant } from '../../../common/decorators/requires-tenant.decorator';
import { ErrorResponseDto } from '../../../shared/dto/error-response.dto';
import { CreateTenantContactUseCase } from '../application/use-cases/create-tenant-contact.use-case';
import { GetTenantContactByIdUseCase } from '../application/use-cases/get-tenant-contact-by-id.use-case';
import { ListTenantContactsUseCase } from '../application/use-cases/list-tenant-contacts.use-case';
import { UpdateTenantContactUseCase } from '../application/use-cases/update-tenant-contact.use-case';
import { ArchiveTenantContactUseCase } from '../application/use-cases/archive-tenant-contact.use-case';
import { CreateTenantContactDto } from './dto/create-tenant-contact.dto';
import { ListContactsQueryDto } from './dto/list-contacts-query.dto';
import { UpdateTenantContactDto } from './dto/update-tenant-contact.dto';
import { PaginatedTenantContactsResponseDto } from './dto/paginated-tenant-contacts-response.dto';
import { TenantContactResponseDto } from './dto/tenant-contact-response.dto';

/**
 * ContactsController — thin HTTP adapter for renter contact endpoints.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT use PrismaService.
 * - MUST NOT parse JWT or read tenantId from request body/query/header.
 * - MUST NOT contain business logic — delegates entirely to use cases.
 * - tenantId is extracted from verified request context via @CurrentTenant().
 */
@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly createTenantContact: CreateTenantContactUseCase,
    private readonly listTenantContacts: ListTenantContactsUseCase,
    private readonly getTenantContactById: GetTenantContactByIdUseCase,
    private readonly updateTenantContact: UpdateTenantContactUseCase,
    private readonly archiveTenantContact: ArchiveTenantContactUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'List all renter contacts for the current workspace' })
  @ApiOkResponse({
    description: 'Paginated contact list.',
    type: PaginatedTenantContactsResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' })
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
    @Query() query: ListContactsQueryDto,
  ): Promise<PaginatedTenantContactsResponseDto> {
    const result = await this.listTenantContacts.execute({
      tenantId,
      page: query.page,
      limit: query.limit,
    });
    return PaginatedTenantContactsResponseDto.fromDomain(result, query.page, query.limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'Get a renter contact by ID' })
  @ApiParam({ name: 'id', description: 'Contact unique identifier' })
  @ApiOkResponse({
    description: 'Contact found.',
    type: TenantContactResponseDto,
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Contact not found or not accessible.',
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
  ): Promise<TenantContactResponseDto> {
    const contact = await this.getTenantContactById.execute({ id, tenantId });
    return TenantContactResponseDto.fromDomain(contact);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'Partially update a renter contact' })
  @ApiParam({ name: 'id', description: 'Contact unique identifier' })
  @ApiOkResponse({
    description: 'Contact updated successfully.',
    type: TenantContactResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Empty body or validation error.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Contact not found or not accessible.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'A contact with this email already exists in this workspace.',
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
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTenantContactDto,
  ): Promise<TenantContactResponseDto> {
    const contact = await this.updateTenantContact.execute({
      id,
      tenantId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      idNumber: dto.idNumber,
      notes: dto.notes,
    });
    return TenantContactResponseDto.fromDomain(contact);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresTenant()
  @ApiOperation({ summary: 'Archive a renter contact (soft-delete)' })
  @ApiParam({ name: 'id', description: 'Contact unique identifier' })
  @ApiNoContentResponse({ description: 'Contact archived successfully.' })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Contact not found or not accessible.',
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
  async archive(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.archiveTenantContact.execute({ id, tenantId });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresTenant()
  @ApiOperation({ summary: 'Create a renter contact for the current workspace' })
  @ApiCreatedResponse({
    description: 'Contact created successfully.',
    type: TenantContactResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Validation error — missing or invalid request body fields.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing or invalid Bearer token.',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Authenticated but no active organization/tenant context.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'A contact with this email already exists in this workspace.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Unexpected server error.',
  })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateTenantContactDto,
  ): Promise<TenantContactResponseDto> {
    const contact = await this.createTenantContact.execute({
      tenantId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone ?? null,
      idNumber: dto.idNumber ?? null,
      notes: dto.notes ?? null,
    });
    return TenantContactResponseDto.fromDomain(contact);
  }
}
