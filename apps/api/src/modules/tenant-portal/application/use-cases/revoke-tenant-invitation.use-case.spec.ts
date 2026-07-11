import { NotFoundException } from '@nestjs/common';
import { RevokeTenantInvitationUseCase } from './revoke-tenant-invitation.use-case';
import {
  TENANT_USER_REPOSITORY,
  TenantUserRepository,
} from '../repositories/tenant-user.repository';
import { TenantUser } from '../../domain/entities/tenant-user.entity';

void TENANT_USER_REPOSITORY;

const revoked: TenantUser = {
  id: 'tu_001',
  tenantId: 'tenant_A',
  tenantContactId: 'contact_001',
  email: 'renter@example.com',
  clerkUserId: null,
  status: 'REVOKED',
  invitationToken: null,
  invitationExpiresAt: null,
  activatedAt: null,
  deletedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('RevokeTenantInvitationUseCase', () => {
  const mockRepo: TenantUserRepository = {
    createInvitation: jest.fn(),
    findActiveByClerkUserId: jest.fn(),
    findByInvitationToken: jest.fn(),
    activate: jest.fn(),
    findByContactId: jest.fn(),
    findById: jest.fn(),
    findPagedByTenant: jest.fn(),
    revoke: jest.fn(),
  };

  let useCase: RevokeTenantInvitationUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RevokeTenantInvitationUseCase(mockRepo);
  });

  it('returns the revoked account', async () => {
    (mockRepo.revoke as jest.Mock).mockResolvedValue(revoked);

    const result = await useCase.execute({ id: 'tu_001', tenantId: 'tenant_A' });

    expect(result).toEqual(revoked);
    expect(mockRepo.revoke).toHaveBeenCalledWith('tu_001', 'tenant_A');
  });

  it('throws NotFoundException when not found (or cross-tenant)', async () => {
    (mockRepo.revoke as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'tu_001', tenantId: 'tenant_B' }),
    ).rejects.toThrow(NotFoundException);
  });
});
