import { ApiProperty } from '@nestjs/swagger';
import { PagedLeases } from '../../application/types/lease-repository.types';
import { LeaseResponseDto } from './lease-response.dto';

export class PaginatedLeasesResponseDto {
  @ApiProperty({ type: [LeaseResponseDto] })
  items!: LeaseResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  static fromDomain(
    result: PagedLeases,
    page: number,
    limit: number,
  ): PaginatedLeasesResponseDto {
    const dto = new PaginatedLeasesResponseDto();
    dto.items = result.items.map((l) => LeaseResponseDto.fromDomain(l));
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
