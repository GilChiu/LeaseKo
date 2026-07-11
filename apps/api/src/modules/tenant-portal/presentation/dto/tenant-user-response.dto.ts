import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TenantUser,
  TenantUserStatus,
} from '../../domain/entities/tenant-user.entity';

export class TenantUserResponseDto {
  @ApiProperty({ example: 'uuid-v4-here' })
  id!: string;

  @ApiProperty({ example: 'uuid-of-tenant' })
  tenantId!: string;

  @ApiProperty({ example: 'uuid-of-tenant-contact' })
  tenantContactId!: string;

  @ApiProperty({ example: 'renter@example.com' })
  email!: string;

  @ApiProperty({
    enum: ['PENDING', 'ACTIVE', 'REVOKED'],
    example: 'PENDING',
  })
  status!: TenantUserStatus;

  @ApiPropertyOptional({
    example: '2026-07-01T00:00:00.000Z',
    nullable: true,
    description: 'When a PENDING invitation expires',
  })
  invitationExpiresAt!: Date | null;

  @ApiPropertyOptional({
    example: '2026-06-20T12:00:00.000Z',
    nullable: true,
  })
  activatedAt!: Date | null;

  @ApiProperty({ example: '2026-06-15T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-15T12:00:00.000Z' })
  updatedAt!: Date;

  static fromDomain(tenantUser: TenantUser): TenantUserResponseDto {
    const dto = new TenantUserResponseDto();
    dto.id = tenantUser.id;
    dto.tenantId = tenantUser.tenantId;
    dto.tenantContactId = tenantUser.tenantContactId;
    dto.email = tenantUser.email;
    dto.status = tenantUser.status;
    dto.invitationExpiresAt = tenantUser.invitationExpiresAt;
    dto.activatedAt = tenantUser.activatedAt;
    dto.createdAt = tenantUser.createdAt;
    dto.updatedAt = tenantUser.updatedAt;
    return dto;
  }
}
