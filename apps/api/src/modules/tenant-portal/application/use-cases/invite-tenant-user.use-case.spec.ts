import { ConflictException, NotFoundException } from '@nestjs/common';
import { InviteTenantUserUseCase } from './invite-tenant-user.use-case';
import {
  TENANT_USER_REPOSITORY,
  TenantUserRepository,
} from '../repositories/tenant-user.repository';
import { TenantUser } from '../../domain/entities/tenant-user.entity';

void TENANT_USER_REPOSITORY;

const pendingInvitation: TenantUser = {
  id: 'tu_001',
  tenantId: 'tenant_A',
  tenantContactId: 'contact_001',
  email: 'renter@example.com',
  clerkUserId: null,
  status: 'PENDING',
  invitationToken: 'a'.repeat(64),
  invitationExpiresAt: new Date(Date.now() + 86400000),
  activatedAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('InviteTenantUserUseCase', () => {
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

  let useCase: InviteTenantUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new InviteTenantUserUseCase(mockRepo);
  });

  it('creates an invitation for a contact without an existing account', async () => {
    (mockRepo.findByContactId as jest.Mock).mockResolvedValue(null);
    (mockRepo.createInvitation as jest.Mock).mockResolvedValue(
      pendingInvitation,
    );

    const result = await useCase.execute({
      tenantId: 'tenant_A',
      tenantContactId: 'contact_001',
    });

    expect(result).toEqual(pendingInvitation);
  });

  it('generates a 64-char hex token with a future expiry', async () => {
    (mockRepo.findByContactId as jest.Mock).mockResolvedValue(null);
    (mockRepo.createInvitation as jest.Mock).mockResolvedValue(
      pendingInvitation,
    );

    await useCase.execute({
      tenantId: 'tenant_A',
      tenantContactId: 'contact_001',
    });

    const arg = (mockRepo.createInvitation as jest.Mock).mock.calls[0][0];
    expect(arg.invitationToken).toMatch(/^[a-f0-9]{64}$/);
    expect(arg.invitationExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('throws ConflictException when the contact already has an account', async () => {
    (mockRepo.findByContactId as jest.Mock).mockResolvedValue(
      pendingInvitation,
    );

    await expect(
      useCase.execute({ tenantId: 'tenant_A', tenantContactId: 'contact_001' }),
    ).rejects.toThrow(ConflictException);
    expect(mockRepo.createInvitation).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the contact is not found', async () => {
    (mockRepo.findByContactId as jest.Mock).mockResolvedValue(null);
    (mockRepo.createInvitation as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ tenantId: 'tenant_A', tenantContactId: 'missing' }),
    ).rejects.toThrow(NotFoundException);
  });

  describe('cross-tenant isolation', () => {
    it('scopes the duplicate check and creation to the caller tenant', async () => {
      (mockRepo.findByContactId as jest.Mock).mockResolvedValue(null);
      (mockRepo.createInvitation as jest.Mock).mockResolvedValue({
        ...pendingInvitation,
        tenantId: 'tenant_B',
      });

      await useCase.execute({
        tenantId: 'tenant_B',
        tenantContactId: 'contact_001',
      });

      expect(mockRepo.findByContactId).toHaveBeenCalledWith(
        'contact_001',
        'tenant_B',
      );
      const arg = (mockRepo.createInvitation as jest.Mock).mock.calls[0][0];
      expect(arg.tenantId).toBe('tenant_B');
    });
  });
});
