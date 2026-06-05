import { Inject, Injectable } from "@nestjs/common";
import {
  TENANT_REPOSITORY,
  TenantRecord,
  TenantRepository,
} from "../repositories/tenant.repository";

export interface SyncTenantInput {
  clerkOrgId: string;
  name: string;
}

@Injectable()
export class SyncTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
  ) {}

  async execute(input: SyncTenantInput): Promise<TenantRecord> {
    const existing = await this.tenantRepository.findByClerkOrgId(
      input.clerkOrgId,
    );

    if (existing) {
      if (existing.name !== input.name) {
        const updated = await this.tenantRepository.updateName(
          existing.id,
          input.name,
        );
        return updated ?? existing;
      }
      return existing;
    }

    return this.tenantRepository.create({
      clerkOrgId: input.clerkOrgId,
      name: input.name,
    });
  }
}
