import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { IRequestContext } from "../../../common/types/request-context.type";

@ApiTags("auth")
@ApiBearerAuth()
@Controller("auth")
export class AuthController {
  @Get("me")
  @ApiOkResponse({ description: "Returns the authenticated user's ID." })
  me(@CurrentUser() user: IRequestContext): { userId: string } {
    return { userId: user.userId };
  }
}
