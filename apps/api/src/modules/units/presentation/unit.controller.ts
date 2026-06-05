import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequiresTenant } from '../../../common/decorators/requires-tenant.decorator';
import { ErrorResponseDto } from '../../../shared/dto/error-response.dto';
import { GetUnitByIdUseCase } from '../application/use-cases/get-unit-by-id.use-case';
import { UpdateUnitUseCase } from '../application/use-cases/update-unit.use-case';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitResponseDto } from './dto/unit-response.dto';

/**
 * UnitController — thin HTTP adapter for direct unit access endpoints.
 *
 * Handles flat-path routes (/units/:id) that do not require a propertyId.
 * This is separate from UnitsController which handles the nested
 * /properties/:propertyId/units routes.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT use PrismaService.
 * - MUST NOT parse JWT or read tenantId from request body/query/header.
 * - MUST NOT contain business logic — delegates entirely to use cases.
 * - tenantId is extracted from verified request context via @CurrentTenant().
 */
@ApiTags('Units')
@ApiBearerAuth()
@Controller('units')
export class UnitController {
  constructor(
    private readonly getUnitById: GetUnitByIdUseCase,
    private readonly updateUnit: UpdateUnitUseCase,
  ) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'Get a unit by its ID' })
  @ApiParam({ name: 'id', description: 'Unit unique identifier' })
  @ApiOkResponse({
    description: 'Unit found.',
    type: UnitResponseDto,
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description:
      'Unit not found or belongs to a different tenant. Both cases are indistinguishable.',
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
  ): Promise<UnitResponseDto> {
    const unit = await this.getUnitById.execute({ id, tenantId });
    return UnitResponseDto.fromDomain(unit);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'Partially update a unit by its ID' })
  @ApiParam({ name: 'id', description: 'Unit unique identifier' })
  @ApiOkResponse({
    description: 'Unit updated successfully.',
    type: UnitResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Empty payload or invalid field values.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description:
      'Unit not found or belongs to a different tenant. Both cases are indistinguishable.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Unit number already exists under this property.',
  })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'Status transition not permitted by lifecycle rules.',
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
    @Body() dto: UpdateUnitDto,
  ): Promise<UnitResponseDto> {
    if (!Object.values(dto).some((v) => v !== undefined)) {
      throw new BadRequestException(
        'At least one field must be provided to update a unit.',
      );
    }
    const updated = await this.updateUnit.execute({
      id,
      tenantId,
      data: { ...dto },
    });
    return UnitResponseDto.fromDomain(updated);
  }
}
