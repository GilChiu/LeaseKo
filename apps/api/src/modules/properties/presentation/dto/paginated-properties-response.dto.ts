import { ApiProperty } from '@nestjs/swagger';
import { PagedProperties } from '../../application/types/property-repository.types';
import { PropertyResponseDto } from './property-response.dto';

/**
 * PaginatedPropertiesResponseDto — response envelope for GET /properties.
 *
 * Wraps the paginated property list with metadata needed for client navigation.
 * Does not expose Prisma types, raw DB internals, or tenant isolation details.
 */
export class PaginatedPropertiesResponseDto {
  @ApiProperty({ type: [PropertyResponseDto] })
  items!: PropertyResponseDto[];

  @ApiProperty({ example: 42, description: 'Total active properties for this tenant' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Current page (1-based)' })
  page!: number;

  @ApiProperty({ example: 20, description: 'Items per page' })
  limit!: number;

  @ApiProperty({ example: true, description: 'Whether more pages exist after this one' })
  hasMore!: boolean;

  static fromDomain(
    pagedResult: PagedProperties,
    page: number,
    limit: number,
  ): PaginatedPropertiesResponseDto {
    const dto = new PaginatedPropertiesResponseDto();
    dto.items = pagedResult.items.map(PropertyResponseDto.fromDomain);
    dto.total = pagedResult.total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < pagedResult.total;
    return dto;
  }
}
