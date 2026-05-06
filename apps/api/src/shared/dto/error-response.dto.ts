import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class ApiErrorBodyDto {
  @ApiProperty({ example: "UNAUTHORIZED" })
  code!: string;

  @ApiProperty({ example: "Unauthorized" })
  message!: string;

  @ApiProperty({ example: 401 })
  statusCode!: number;

  @ApiProperty({ example: "2026-05-06T12:00:00.000Z" })
  timestamp!: string;

  @ApiProperty({ example: "/api/v1/me" })
  path!: string;

  @ApiPropertyOptional({
    description: "Field-level validation details (validation errors only)",
  })
  details?: object;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ type: ApiErrorBodyDto })
  error!: ApiErrorBodyDto;
}
