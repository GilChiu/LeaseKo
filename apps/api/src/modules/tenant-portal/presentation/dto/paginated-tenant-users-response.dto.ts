import { ApiProperty } from '@nestjs/swagger';
import { TenantUserResponseDto } from './tenant-user-response.dto';
import { PagedTenantUsers } from '../../application/types/tenant-user-repository.types';

export class PaginatedTenantUsersResponseDto {
  @ApiProperty({ type: [TenantUserResponseDto] })
  items!: TenantUserResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  static fromDomain(
    result: PagedTenantUsers,
    page: number,
    limit: number,
  ): PaginatedTenantUsersResponseDto {
    const dto = new PaginatedTenantUsersResponseDto();
    dto.items = result.items.map((t) => TenantUserResponseDto.fromDomain(t));
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
