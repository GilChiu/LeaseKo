import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteTenantUserDto {
  @ApiProperty({
    example: 'uuid-of-tenant-contact',
    description: 'Tenant contact (renter) to invite to the portal',
  })
  @IsUUID()
  @IsNotEmpty()
  tenantContactId!: string;
}
