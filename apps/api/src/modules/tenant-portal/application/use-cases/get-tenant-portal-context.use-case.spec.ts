import { NotFoundException } from '@nestjs/common';
import { GetTenantPortalContextUseCase } from './get-tenant-portal-context.use-case';
import {
  TENANT_USER_REPOSITORY,
  TenantUserRepository,
} from '../repositories/tenant-user.repository';
import { TenantUser } from '../../domain/entities/tenant-user.entity';

void TENANT_USER_REPOSITORY;

const account: TenantUser = {
  id: 'tu_001',
  tenantId: 'tenant_A',
  tenantContactId: 'contact_001',
  email: 'renter@example.com',
  clerkUserId: 'user_clerk_1',
  status: 'ACTIVE',
  invitationToken: null,
  invitationExpiresAt: null,
  activatedAt: new Date(),
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GetTenantPortalContextUseCase', () => {
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

  let useCase: GetTenantPortalContextUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetTenantPortalContextUseCase(mockRepo);
  });

  it('returns the active account for the Clerk identity', async () => {
    (mockRepo.findActiveByClerkUserId as jest.Mock).mockResolvedValue(account);

    const result = await useCase.execute({ clerkUserId: 'user_clerk_1' });

    expect(result).toEqual(account);
    expect(mockRepo.findActiveByClerkUserId).toHaveBeenCalledWith(
      'user_clerk_1',
    );
  });

  it('throws NotFoundException when no active account exists', async () => {
    (mockRepo.findActiveByClerkUserId as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ clerkUserId: 'user_unknown' }),
    ).rejects.toThrow(NotFoundException);
  });
});
