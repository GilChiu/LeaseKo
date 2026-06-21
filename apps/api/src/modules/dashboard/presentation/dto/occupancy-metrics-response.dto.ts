import { ApiProperty } from '@nestjs/swagger';
import { OccupancyMetrics } from '../../domain/entities/occupancy-metrics.entity';

export class OccupancyMetricsResponseDto {
  @ApiProperty({ example: 5 })
  totalProperties!: number;

  @ApiProperty({ example: 40 })
  totalUnits!: number;

  @ApiProperty({ example: 32 })
  occupiedUnits!: number;

  @ApiProperty({ example: 6 })
  vacantUnits!: number;

  @ApiProperty({ example: 80, description: 'occupiedUnits / totalUnits * 100' })
  occupancyPercentage!: number;

  static fromDomain(
    metrics: OccupancyMetrics,
  ): OccupancyMetricsResponseDto {
    const dto = new OccupancyMetricsResponseDto();
    dto.totalProperties = metrics.totalProperties;
    dto.totalUnits = metrics.totalUnits;
    dto.occupiedUnits = metrics.occupiedUnits;
    dto.vacantUnits = metrics.vacantUnits;
    dto.occupancyPercentage = metrics.occupancyPercentage;
    return dto;
  }
}
