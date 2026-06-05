import { ApiProperty } from '@nestjs/swagger';
import { PagedUnits } from '../../application/types/unit-repository.types';
import { UnitResponseDto } from './unit-response.dto';

/**
 * PaginatedUnitsResponseDto — response envelope for GET /properties/:propertyId/units.
 *
 * Wraps the paginated unit list with metadata needed for client navigation.
 * Does not expose Prisma types, raw DB internals, or tenant isolation details.
 */
export class PaginatedUnitsResponseDto {
  @ApiProperty({ type: [UnitResponseDto] })
  items!: UnitResponseDto[];

  @ApiProperty({
    example: 12,
    description: 'Total units for this property (across all pages)',
  })
  total!: number;

  @ApiProperty({ example: 1, description: 'Current page (1-based)' })
  page!: number;

  @ApiProperty({ example: 50, description: 'Items per page' })
  limit!: number;

  @ApiProperty({
    example: false,
    description: 'Whether more pages exist after this one',
  })
  hasMore!: boolean;

  static fromDomain(
    pagedResult: PagedUnits,
    page: number,
    limit: number,
  ): PaginatedUnitsResponseDto {
    const dto = new PaginatedUnitsResponseDto();
    dto.items = pagedResult.items.map(UnitResponseDto.fromDomain);
    dto.total = pagedResult.total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < pagedResult.total;
    return dto;
  }
}
