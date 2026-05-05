import { Controller, Get, Req } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Request } from "express";
import { IRequestContext } from "../../../common/types/request-context.type";
import { ErrorResponseDto } from "../../../shared/dto/error-response.dto";
import { MeResponseDto } from "./dto/me-response.dto";

@ApiTags("System")
@ApiBearerAuth()
@Controller()
export class SystemController {
  @Get("me")
  @ApiOperation({
    summary: "Get current user context",
    description:
      "Returns the authenticated caller's user ID and tenant ID derived from the Bearer JWT. Tenant ID is never a manual input.",
  })
  @ApiOkResponse({
    type: MeResponseDto,
    description: "Authenticated user context",
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: "Missing or invalid Bearer token",
  })
  me(@Req() req: Request & { user: IRequestContext }): { userId: string } {
    return { userId: req.user.userId };
  }
}
