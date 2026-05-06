import { Controller, Get } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentTenant } from "../../../common/decorators/current-tenant.decorator";
import { RequiresTenant } from "../../../common/decorators/requires-tenant.decorator";
import { ErrorResponseDto } from "../../../shared/dto/error-response.dto";

@ApiTags("tenant-context")
@ApiBearerAuth()
@Controller("tenant-context")
export class TenantContextController {
  @Get()
  @RequiresTenant()
  @ApiOperation({ summary: "Get current tenant context" })
  @ApiOkResponse({
    description: "Active tenant context.",
    schema: { example: { tenantId: "org_2abc123xyz" } },
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: "Missing or invalid Bearer token.",
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: "Authenticated but no active organization context.",
  })
  getTenantContext(@CurrentTenant() tenantId: string): { tenantId: string } {
    return { tenantId };
  }
}
