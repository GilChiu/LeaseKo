import { ApiProperty } from "@nestjs/swagger";

export class MeResponseDto {
  @ApiProperty({
    example: "user_abc123",
    description: "Clerk user ID of the authenticated caller",
  })
  userId!: string;

  @ApiProperty({
    example: "tenant_xyz789",
    description: "Tenant ID derived from Clerk organisation claim in the JWT",
  })
  tenantId!: string;
}
