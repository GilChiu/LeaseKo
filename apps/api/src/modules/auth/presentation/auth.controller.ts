import { Controller, Get } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequiresTenant } from "../../../common/decorators/requires-tenant.decorator";
import { IRequestContext } from "../../../common/types/request-context.type";

@ApiTags("auth")
@ApiBearerAuth()
@Controller("auth")
export class AuthController {
  @Get("me")
  @RequiresTenant()
  @ApiOperation({ summary: "Get current user and tenant context" })
  @ApiOkResponse({
    description: "Authenticated user and tenant context.",
    schema: { example: { userId: "user_2abc123", tenantId: "org_456xyz" } },
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid Bearer token." })
  @ApiForbiddenResponse({
    description: "Authenticated but no active organization context.",
  })
  me(
    @CurrentUser() user: IRequestContext,
  ): { userId: string; tenantId: string } {
    return { userId: user.userId, tenantId: user.tenantId as string };
  }
}
