import { ApiProperty } from '@nestjs/swagger';
import { RevenueMetrics } from '../../domain/entities/revenue-metrics.entity';

export class RevenueMetricsResponseDto {
  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 6 })
  month!: number;

  @ApiProperty({
    example: 125000,
    description: 'Total billed for the window (PENDING/PAID/OVERDUE invoices)',
  })
  monthlyRevenue!: number;

  @ApiProperty({
    example: 98000,
    description: 'COMPLETED payments recorded within the window',
  })
  collectedRent!: number;

  @ApiProperty({
    example: 54000,
    description: 'Total amount of PENDING/OVERDUE invoices (all-time)',
  })
  outstandingAmount!: number;

  @ApiProperty({ example: 12 })
  outstandingCount!: number;

  @ApiProperty({
    example: 21000,
    description: 'Total amount of OVERDUE invoices (all-time)',
  })
  overdueAmount!: number;

  @ApiProperty({ example: 4 })
  overdueCount!: number;

  static fromDomain(metrics: RevenueMetrics): RevenueMetricsResponseDto {
    const dto = new RevenueMetricsResponseDto();
    dto.year = metrics.year;
    dto.month = metrics.month;
    dto.monthlyRevenue = metrics.monthlyRevenue;
    dto.collectedRent = metrics.collectedRent;
    dto.outstandingAmount = metrics.outstandingAmount;
    dto.outstandingCount = metrics.outstandingCount;
    dto.overdueAmount = metrics.overdueAmount;
    dto.overdueCount = metrics.overdueCount;
    return dto;
  }
}
