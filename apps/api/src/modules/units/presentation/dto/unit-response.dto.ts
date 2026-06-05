import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '../../domain/entities/unit.entity';

/**
 * UnitResponseDto — response shape for Unit API endpoints.
 *
 * Maps the Unit domain entity to a response-safe object.
 * Does not expose Prisma types or raw DB internals.
 */
export class UnitResponseDto {
  @ApiProperty({ example: 'uuid-v4-here' })
  id!: string;

  @ApiProperty({
    example: 'org_2abc123xyz',
    description:
      'Tenant that owns this unit. Always derived from the parent property\'s tenantId.',
  })
  tenantId!: string;

  @ApiProperty({ example: 'uuid-v4-here' })
  propertyId!: string;

  @ApiProperty({ example: '101' })
  unitNumber!: string;

  @ApiProperty({
    example: 'AVAILABLE',
    enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'],
    description: 'Always AVAILABLE on creation.',
  })
  status!: string;

  @ApiPropertyOptional({ example: 85.5, nullable: true })
  floorArea!: number | null;

  @ApiPropertyOptional({ example: 2, nullable: true })
  bedrooms!: number | null;

  @ApiPropertyOptional({ example: 1.5, nullable: true })
  bathrooms!: number | null;

  @ApiPropertyOptional({ example: 15000.0, nullable: true })
  monthlyRent!: number | null;

  @ApiPropertyOptional({ example: 'Corner unit with garden view.', nullable: true })
  description!: string | null;

  @ApiProperty({ example: '2026-06-04T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-04T10:00:00.000Z' })
  updatedAt!: Date;

  static fromDomain(unit: Unit): UnitResponseDto {
    const dto = new UnitResponseDto();
    dto.id = unit.id;
    dto.tenantId = unit.tenantId;
    dto.propertyId = unit.propertyId;
    dto.unitNumber = unit.unitNumber;
    dto.status = unit.status;
    dto.floorArea = unit.floorArea;
    dto.bedrooms = unit.bedrooms;
    dto.bathrooms = unit.bathrooms;
    dto.monthlyRent = unit.monthlyRent;
    dto.description = unit.description;
    dto.createdAt = unit.createdAt;
    dto.updatedAt = unit.updatedAt;
    return dto;
  }
}
