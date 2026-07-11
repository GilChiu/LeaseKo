import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { InviteTenantUserUseCase } from '../application/use-cases/invite-tenant-user.use-case';
import { ListTenantUsersUseCase } from '../application/use-cases/list-tenant-users.use-case';
import { RevokeTenantInvitationUseCase } from '../application/use-cases/revoke-tenant-invitation.use-case';
import { InviteTenantUserDto } from './dto/invite-tenant-user.dto';
import { ListTenantUsersQueryDto } from './dto/list-tenant-users-query.dto';
import { InvitationCreatedResponseDto } from './dto/invitation-created-response.dto';
import { TenantUserResponseDto } from './dto/tenant-user-response.dto';
import { PaginatedTenantUsersResponseDto } from './dto/paginated-tenant-users-response.dto';

@ApiTags('Tenant Invitations')
@ApiBearerAuth()
@Controller('tenant-invitations')
export class TenantInvitationsController {
  constructor(
    private readonly inviteTenantUser: InviteTenantUserUseCase,
    private readonly listTenantUsers: ListTenantUsersUseCase,
    private readonly revokeTenantInvitation: RevokeTenantInvitationUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({
    summary: 'List tenant portal accounts and invitations for the workspace',
  })
  @ApiOkResponse({
    description: 'Paginated tenant portal account list.',
    type: PaginatedTenantUsersResponseDto,
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
    name: 'status',
    required: false,
    enum: ['PENDING', 'ACTIVE', 'REVOKED'],
    description: 'Filter by status',
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
    @Query() query: ListTenantUsersQueryDto,
  ): Promise<PaginatedTenantUsersResponseDto> {
    const result = await this.listTenantUsers.execute({
      tenantId,
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
    return PaginatedTenantUsersResponseDto.fromDomain(
      result,
      query.page,
      query.limit,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresTenant()
  @ApiOperation({ summary: 'Invite a tenant contact to the tenant portal' })
  @ApiCreatedResponse({
    description:
      'Invitation created. Includes the raw token (shown once) until email delivery lands.',
    type: InvitationCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Validation error.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Tenant contact not found or not accessible.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'The contact already has a portal account or invitation.',
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
  async invite(
    @CurrentTenant() tenantId: string,
    @Body() dto: InviteTenantUserDto,
  ): Promise<InvitationCreatedResponseDto> {
    const invitation = await this.inviteTenantUser.execute({
      tenantId,
      tenantContactId: dto.tenantContactId,
    });
    return InvitationCreatedResponseDto.fromDomain(invitation);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'Revoke a tenant portal account or invitation' })
  @ApiParam({ name: 'id', description: 'Tenant portal account UUID' })
  @ApiOkResponse({
    description: 'Account revoked.',
    type: TenantUserResponseDto,
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Tenant portal account not found or not accessible.',
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
  async revoke(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenantUserResponseDto> {
    const revoked = await this.revokeTenantInvitation.execute({
      id,
      tenantId,
    });
    return TenantUserResponseDto.fromDomain(revoked);
  }
}
