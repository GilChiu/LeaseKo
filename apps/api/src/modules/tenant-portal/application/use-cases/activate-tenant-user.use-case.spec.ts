import { BadRequestException, ConflictException } from '@nestjs/common';
import { ActivateTenantUserUseCase } from './activate-tenant-user.use-case';
import {
  TENANT_USER_REPOSITORY,
  TenantUserRepository,
} from '../repositories/tenant-user.repository';
import { TenantUser } from '../../domain/entities/tenant-user.entity';

void TENANT_USER_REPOSITORY;

const pending: TenantUser = {
  id: 'tu_001',
  tenantId: 'tenant_A',
  tenantContactId: 'contact_001',
  email: 'renter@example.com',
  clerkUserId: null,
  status: 'PENDING',
  invitationToken: 'tok_123',
  invitationExpiresAt: new Date(Date.now() + 86400000),
  activatedAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const activated: TenantUser = {
  ...pending,
  clerkUserId: 'user_clerk_1',
  status: 'ACTIVE',
  invitationToken: null,
  invitationExpiresAt: null,
  activatedAt: new Date(),
};

describe('ActivateTenantUserUseCase', () => {
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

  let useCase: ActivateTenantUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ActivateTenantUserUseCase(mockRepo);
  });

  it('activates a pending invitation and binds the Clerk identity', async () => {
    (mockRepo.findByInvitationToken as jest.Mock).mockResolvedValue(pending);
    (mockRepo.findActiveByClerkUserId as jest.Mock).mockResolvedValue(null);
    (mockRepo.activate as jest.Mock).mockResolvedValue(activated);

    const result = await useCase.execute({
      clerkUserId: 'user_clerk_1',
      token: 'tok_123',
    });

    expect(result).toEqual(activated);
    expect(mockRepo.activate).toHaveBeenCalledWith('tu_001', 'user_clerk_1');
  });

  it('throws BadRequestException for an unknown token', async () => {
    (mockRepo.findByInvitationToken as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ clerkUserId: 'user_clerk_1', token: 'nope' }),
    ).rejects.toThrow(BadRequestException);
    expect(mockRepo.activate).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the invitation is not pending', async () => {
    (mockRepo.findByInvitationToken as jest.Mock).mockResolvedValue({
      ...pending,
      status: 'ACTIVE',
    });

    await expect(
      useCase.execute({ clerkUserId: 'user_clerk_1', token: 'tok_123' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when the invitation is expired', async () => {
    (mockRepo.findByInvitationToken as jest.Mock).mockResolvedValue({
      ...pending,
      invitationExpiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      useCase.execute({ clerkUserId: 'user_clerk_1', token: 'tok_123' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ConflictException when the identity is already bound', async () => {
    (mockRepo.findByInvitationToken as jest.Mock).mockResolvedValue(pending);
    (mockRepo.findActiveByClerkUserId as jest.Mock).mockResolvedValue({
      ...activated,
      id: 'tu_other',
    });

    await expect(
      useCase.execute({ clerkUserId: 'user_clerk_1', token: 'tok_123' }),
    ).rejects.toThrow(ConflictException);
    expect(mockRepo.activate).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when activation races to null', async () => {
    (mockRepo.findByInvitationToken as jest.Mock).mockResolvedValue(pending);
    (mockRepo.findActiveByClerkUserId as jest.Mock).mockResolvedValue(null);
    (mockRepo.activate as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ clerkUserId: 'user_clerk_1', token: 'tok_123' }),
    ).rejects.toThrow(BadRequestException);
  });
});
