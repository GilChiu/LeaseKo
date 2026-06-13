import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantContact } from '../../domain/entities/tenant-contact.entity';

/**
 * TenantContactResponseDto — response shape for Contact API endpoints.
 *
 * Maps the TenantContact domain entity to a response-safe object.
 * deletedAt is intentionally excluded — clients never need it.
 */
export class TenantContactResponseDto {
  @ApiProperty({ example: 'uuid-v4-here' })
  id!: string;

  @ApiProperty({ example: 'org_2abc123xyz' })
  tenantId!: string;

  @ApiProperty({ example: 'Alice' })
  firstName!: string;

  @ApiProperty({ example: 'Smith' })
  lastName!: string;

  @ApiProperty({ example: 'alice@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: '+63 912 345 6789', nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ example: 'P-12345678A', nullable: true })
  idNumber!: string | null;

  @ApiPropertyOptional({ example: 'Prefers move-in after August.', nullable: true })
  notes!: string | null;

  @ApiProperty({ example: '2026-06-05T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-05T12:00:00.000Z' })
  updatedAt!: Date;

  static fromDomain(contact: TenantContact): TenantContactResponseDto {
    const dto = new TenantContactResponseDto();
    dto.id = contact.id;
    dto.tenantId = contact.tenantId;
    dto.firstName = contact.firstName;
    dto.lastName = contact.lastName;
    dto.email = contact.email;
    dto.phone = contact.phone;
    dto.idNumber = contact.idNumber;
    dto.notes = contact.notes;
    dto.createdAt = contact.createdAt;
    dto.updatedAt = contact.updatedAt;
    return dto;
  }
}
