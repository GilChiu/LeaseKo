import { ApiProperty } from '@nestjs/swagger';
import { TenantUser } from '../../domain/entities/tenant-user.entity';

export class TenantPortalContextResponseDto {
  @ApiProperty({ example: 'uuid-of-tenant-user' })
  id!: string;

  @ApiProperty({ example: 'uuid-of-tenant' })
  tenantId!: string;

  @ApiProperty({ example: 'uuid-of-tenant-contact' })
  tenantContactId!: string;

  @ApiProperty({ example: 'renter@example.com' })
  email!: string;

  static fromDomain(
    tenantUser: TenantUser,
  ): TenantPortalContextResponseDto {
    const dto = new TenantPortalContextResponseDto();
    dto.id = tenantUser.id;
    dto.tenantId = tenantUser.tenantId;
    dto.tenantContactId = tenantUser.tenantContactId;
    dto.email = tenantUser.email;
    return dto;
  }
}
