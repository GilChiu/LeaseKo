import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserOnly } from '../../../common/decorators/user-only.decorator';
import { TenantPortal } from '../../../common/decorators/tenant-portal.decorator';
import { IRequestContext } from '../../../common/types/request-context.type';
import { ErrorResponseDto } from '../../../shared/dto/error-response.dto';
import { ActivateTenantUserUseCase } from '../application/use-cases/activate-tenant-user.use-case';
import { GetTenantPortalContextUseCase } from '../application/use-cases/get-tenant-portal-context.use-case';
import { ActivateTenantUserDto } from './dto/activate-tenant-user.dto';
import { TenantUserResponseDto } from './dto/tenant-user-response.dto';
import { TenantPortalContextResponseDto } from './dto/tenant-portal-context-response.dto';

@ApiTags('Tenant Portal')
@ApiBearerAuth()
@Controller('tenant')
export class TenantPortalController {
  constructor(
    private readonly activateTenantUser: ActivateTenantUserUseCase,
    private readonly getTenantPortalContext: GetTenantPortalContextUseCase,
  ) {}

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @UserOnly()
  @ApiOperation({
    summary: 'Activate a tenant portal account from an invitation token',
  })
  @ApiOkResponse({
    description: 'Account activated and linked to the signed-in identity.',
    type: TenantUserResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Invalid or expired invitation.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'This account is already linked to a tenant portal.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing or invalid Bearer token.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Unexpected server error.',
  })
  async activate(
    @CurrentUser() user: IRequestContext,
    @Body() dto: ActivateTenantUserDto,
  ): Promise<TenantUserResponseDto> {
    const activated = await this.activateTenantUser.execute({
      clerkUserId: user.userId,
      token: dto.token,
    });
    return TenantUserResponseDto.fromDomain(activated);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @TenantPortal()
  @ApiOperation({ summary: 'Get the current tenant portal user context' })
  @ApiOkResponse({
    description: 'The renter portal context.',
    type: TenantPortalContextResponseDto,
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing or invalid Bearer token.',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Not an active tenant portal account.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Tenant portal account not found.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Unexpected server error.',
  })
  async me(
    @CurrentUser() user: IRequestContext,
  ): Promise<TenantPortalContextResponseDto> {
    const account = await this.getTenantPortalContext.execute({
      clerkUserId: user.userId,
    });
    return TenantPortalContextResponseDto.fromDomain(account);
  }
}
