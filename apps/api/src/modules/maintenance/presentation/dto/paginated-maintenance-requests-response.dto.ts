import { ApiProperty } from '@nestjs/swagger';
import { MaintenanceRequestResponseDto } from './maintenance-request-response.dto';
import { PagedMaintenanceRequests } from '../../application/types/maintenance-request-repository.types';

export class PaginatedMaintenanceRequestsResponseDto {
  @ApiProperty({ type: [MaintenanceRequestResponseDto] })
  items!: MaintenanceRequestResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  static fromDomain(
    result: PagedMaintenanceRequests,
    page: number,
    limit: number,
  ): PaginatedMaintenanceRequestsResponseDto {
    const dto = new PaginatedMaintenanceRequestsResponseDto();
    dto.items = result.items.map((r) =>
      MaintenanceRequestResponseDto.fromDomain(r),
    );
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
