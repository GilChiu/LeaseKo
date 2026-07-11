import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateTenantUserDto {
  @ApiProperty({
    example: 'a1b2c3...64-hex-chars',
    description: 'Invitation token from the activation link',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
