import { ApiProperty } from '@nestjs/swagger';
import { PagedTenantContacts } from '../../application/types/tenant-contact-repository.types';
import { TenantContactResponseDto } from './tenant-contact-response.dto';

export class PaginatedTenantContactsResponseDto {
  @ApiProperty({ type: [TenantContactResponseDto] })
  items!: TenantContactResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  static fromDomain(
    result: PagedTenantContacts,
    page: number,
    limit: number,
  ): PaginatedTenantContactsResponseDto {
    const dto = new PaginatedTenantContactsResponseDto();
    dto.items = result.items.map((c) => TenantContactResponseDto.fromDomain(c));
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
