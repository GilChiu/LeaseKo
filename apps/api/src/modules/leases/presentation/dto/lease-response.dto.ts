import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Lease, LeaseStatus } from '../../domain/entities/lease.entity';

export class LeaseResponseDto {
  @ApiProperty({ example: 'uuid-v4-here' })
  id!: string;

  @ApiProperty({ example: 'org_2abc123xyz' })
  tenantId!: string;

  @ApiProperty({ example: 'uuid-of-property' })
  propertyId!: string;

  @ApiProperty({ example: 'uuid-of-unit' })
  unitId!: string;

  @ApiProperty({ example: 'uuid-of-tenant-contact' })
  tenantContactId!: string;

  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'], example: 'DRAFT' })
  status!: LeaseStatus;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  startDate!: Date;

  @ApiProperty({ example: '2027-06-30T00:00:00.000Z' })
  endDate!: Date;

  @ApiProperty({ example: 25000 })
  monthlyRent!: number;

  @ApiPropertyOptional({ example: 50000, nullable: true })
  depositAmount!: number | null;

  @ApiPropertyOptional({ example: 'Month-to-month with 30-day notice.', nullable: true })
  notes!: string | null;

  @ApiProperty({ example: '2026-06-13T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-13T12:00:00.000Z' })
  updatedAt!: Date;

  static fromDomain(lease: Lease): LeaseResponseDto {
    const dto = new LeaseResponseDto();
    dto.id = lease.id;
    dto.tenantId = lease.tenantId;
    dto.propertyId = lease.propertyId;
    dto.unitId = lease.unitId;
    dto.tenantContactId = lease.tenantContactId;
    dto.status = lease.status;
    dto.startDate = lease.startDate;
    dto.endDate = lease.endDate;
    dto.monthlyRent = lease.monthlyRent;
    dto.depositAmount = lease.depositAmount;
    dto.notes = lease.notes;
    dto.createdAt = lease.createdAt;
    dto.updatedAt = lease.updatedAt;
    return dto;
  }
}
