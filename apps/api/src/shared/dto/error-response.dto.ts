import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ErrorResponseDto {
  @ApiProperty({ example: 401, description: "HTTP status code" })
  statusCode!: number;

  @ApiProperty({
    example: "Unauthorized",
    description: "Short human-readable description",
  })
  message!: string;

  @ApiPropertyOptional({
    example: "Missing or invalid Bearer token",
    description: "Additional error detail",
  })
  error?: string;
}
