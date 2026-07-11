import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaseResponseDto } from '../../../leases/presentation/dto/lease-response.dto';
import { PaymentResponseDto } from '../../../payments/presentation/dto/payment-response.dto';
import { MaintenanceRequestResponseDto } from '../../../maintenance/presentation/dto/maintenance-request-response.dto';
import { TenantDashboard } from '../../application/use-cases/get-tenant-dashboard.use-case';

export class TenantDashboardResponseDto {
  @ApiPropertyOptional({
    type: LeaseResponseDto,
    nullable: true,
    description: "The renter's current active lease, or null if none.",
  })
  currentLease!: LeaseResponseDto | null;

  @ApiProperty({
    example: 25000,
    description:
      'Sum of unpaid invoice amounts (status PENDING or OVERDUE) for the renter.',
  })
  outstandingBalance!: number;

  @ApiProperty({
    type: [PaymentResponseDto],
    description: 'The renter\'s most recent payments (newest first).',
  })
  recentPayments!: PaymentResponseDto[];

  @ApiProperty({
    example: 2,
    description:
      'Count of active (OPEN or IN_PROGRESS) maintenance requests on the assigned unit.',
  })
  openMaintenanceCount!: number;

  @ApiProperty({
    type: [MaintenanceRequestResponseDto],
    description: 'Recent maintenance requests for the assigned unit (newest first).',
  })
  recentMaintenance!: MaintenanceRequestResponseDto[];

  static fromDomain(dashboard: TenantDashboard): TenantDashboardResponseDto {
    const dto = new TenantDashboardResponseDto();
    dto.currentLease = dashboard.currentLease
      ? LeaseResponseDto.fromDomain(dashboard.currentLease)
      : null;
    dto.outstandingBalance = dashboard.outstandingBalance;
    dto.recentPayments = dashboard.recentPayments.map((p) =>
      PaymentResponseDto.fromDomain(p),
    );
    dto.openMaintenanceCount = dashboard.openMaintenanceCount;
    dto.recentMaintenance = dashboard.recentMaintenance.map((m) =>
      MaintenanceRequestResponseDto.fromDomain(m),
    );
    return dto;
  }
}
