import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { UserOnly } from "../../../common/decorators/user-only.decorator";
import { IRequestContext } from "../../../common/types/request-context.type";
import { SyncTenantUseCase } from "../application/use-cases/sync-tenant.use-case";
import { SyncTenantDto } from "./dto/sync-tenant.dto";

@ApiTags("tenants")
@ApiBearerAuth()
@Controller("tenants")
export class TenantsController {
  constructor(private readonly syncTenantUseCase: SyncTenantUseCase) {}

  @Post("sync")
  @UserOnly()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Upsert the Tenant record for the active Clerk organisation",
    description:
      "Creates or updates the Tenant row that backs the authenticated user's active Clerk org. " +
      "Must be called after org creation or switching so downstream FK references resolve correctly. " +
      "Does not require an existing Tenant row — use @UserOnly() to allow pre-registration calls.",
  })
  @ApiOkResponse({ schema: { example: { id: "uuid-..." } } })
  async syncTenant(
    @CurrentUser() user: IRequestContext,
    @Body() dto: SyncTenantDto,
  ): Promise<{ id: string }> {
    if (!user.clerkOrgId) {
      throw new ForbiddenException("No active organisation context");
    }
    const tenant = await this.syncTenantUseCase.execute({
      clerkOrgId: user.clerkOrgId,
      name: dto.name,
    });
    return { id: tenant.id };
  }
}
