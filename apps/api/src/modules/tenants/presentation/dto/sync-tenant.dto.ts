import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SyncTenantDto {
  @ApiProperty({ example: "Ayala Corporation" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
