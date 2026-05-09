import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Property } from '../../domain/entities/property.entity';

/**
 * PropertyResponseDto — response shape for Property API endpoints.
 *
 * Maps the Property domain entity to a response-safe object.
 * Does not expose Prisma types, raw DB internals, or Clerk JWT claims.
 * deletedAt is intentionally excluded — clients never need it.
 */
export class PropertyResponseDto {
  @ApiProperty({ example: 'uuid-v4-here' })
  id!: string;

  @ApiProperty({ example: 'org_2abc123xyz' })
  tenantId!: string;

  @ApiProperty({ example: 'Sunset Apartments' })
  name!: string;

  @ApiProperty({ example: '123 Main Street' })
  addressLine1!: string;

  @ApiPropertyOptional({ example: 'Unit A', nullable: true })
  addressLine2!: string | null;

  @ApiProperty({ example: 'Iloilo City' })
  city!: string;

  @ApiPropertyOptional({ example: 'Iloilo', nullable: true })
  state!: string | null;

  @ApiPropertyOptional({ example: '5000', nullable: true })
  postalCode!: string | null;

  @ApiProperty({ example: 'Philippines' })
  country!: string;

  @ApiProperty({ example: 'APARTMENT' })
  propertyType!: string;

  @ApiPropertyOptional({ example: 'A 12-unit apartment building.', nullable: true })
  description!: string | null;

  @ApiProperty({ example: '2026-05-09T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-09T12:00:00.000Z' })
  updatedAt!: Date;

  static fromDomain(property: Property): PropertyResponseDto {
    const dto = new PropertyResponseDto();
    dto.id = property.id;
    dto.tenantId = property.tenantId;
    dto.name = property.name;
    dto.addressLine1 = property.addressLine1;
    dto.addressLine2 = property.addressLine2;
    dto.city = property.city;
    dto.state = property.state;
    dto.postalCode = property.postalCode;
    dto.country = property.country;
    dto.propertyType = property.propertyType;
    dto.description = property.description;
    dto.createdAt = property.createdAt;
    dto.updatedAt = property.updatedAt;
    return dto;
  }
}
