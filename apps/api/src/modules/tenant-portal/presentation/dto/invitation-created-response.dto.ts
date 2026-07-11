import { ApiPropertyOptional } from '@nestjs/swagger';
import { TenantUser } from '../../domain/entities/tenant-user.entity';
import { TenantUserResponseDto } from './tenant-user-response.dto';

/**
 * Returned when a landlord creates an invitation. Includes the raw token so the
 * activation link can be shared until email delivery lands (Epic 26).
 */
export class InvitationCreatedResponseDto extends TenantUserResponseDto {
  @ApiPropertyOptional({
    example: 'a1b2c3...64-hex-chars',
    nullable: true,
    description: 'Raw invitation token (shown once at creation)',
  })
  invitationToken!: string | null;

  static fromDomain(tenantUser: TenantUser): InvitationCreatedResponseDto {
    const dto = new InvitationCreatedResponseDto();
    dto.id = tenantUser.id;
    dto.tenantId = tenantUser.tenantId;
    dto.tenantContactId = tenantUser.tenantContactId;
    dto.email = tenantUser.email;
    dto.status = tenantUser.status;
    dto.invitationExpiresAt = tenantUser.invitationExpiresAt;
    dto.activatedAt = tenantUser.activatedAt;
    dto.createdAt = tenantUser.createdAt;
    dto.updatedAt = tenantUser.updatedAt;
    dto.invitationToken = tenantUser.invitationToken;
    return dto;
  }
}
