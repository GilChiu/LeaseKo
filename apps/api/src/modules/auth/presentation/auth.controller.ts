import { Controller, Get } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { UserOnly } from "../../../common/decorators/user-only.decorator";
import { IRequestContext } from "../../../common/types/request-context.type";

@ApiTags("auth")
@ApiBearerAuth()
@Controller("auth")
export class AuthController {
  @Get("me")
  @UserOnly()
  @ApiOperation({ summary: "Get current user context" })
  @ApiOkResponse({
    description: "Authenticated user context. tenantId is null when no active organization.",
    schema: {
      example: { userId: "user_2abc123", tenantId: "org_456xyz" },
      properties: {
        userId: { type: "string" },
        tenantId: { type: "string", nullable: true },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid Bearer token." })
  me(
    @CurrentUser() user: IRequestContext,
  ): { userId: string; tenantId: string | null } {
    return { userId: user.userId, tenantId: user.tenantId };
  }
}
