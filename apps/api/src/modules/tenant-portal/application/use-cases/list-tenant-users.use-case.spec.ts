import { ListTenantUsersUseCase } from './list-tenant-users.use-case';
import {
  TENANT_USER_REPOSITORY,
  TenantUserRepository,
} from '../repositories/tenant-user.repository';
import { PagedTenantUsers } from '../types/tenant-user-repository.types';

void TENANT_USER_REPOSITORY;

describe('ListTenantUsersUseCase', () => {
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

  let useCase: ListTenantUsersUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListTenantUsersUseCase(mockRepo);
  });

  it('forwards pagination and status to the repository', async () => {
    const paged: PagedTenantUsers = { items: [], total: 0 };
    (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValue(paged);

    const result = await useCase.execute({
      tenantId: 'tenant_A',
      page: 2,
      limit: 10,
      status: 'PENDING',
    });

    expect(result).toEqual(paged);
    expect(mockRepo.findPagedByTenant).toHaveBeenCalledWith('tenant_A', {
      page: 2,
      limit: 10,
      status: 'PENDING',
    });
  });

  it('propagates repository errors', async () => {
    (mockRepo.findPagedByTenant as jest.Mock).mockRejectedValue(
      new Error('DB connection failed'),
    );

    await expect(
      useCase.execute({ tenantId: 'tenant_A', page: 1, limit: 20 }),
    ).rejects.toThrow('DB connection failed');
  });

  describe('cross-tenant isolation', () => {
    it('scopes the query to the caller tenant', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
      });

      await useCase.execute({ tenantId: 'tenant_B', page: 1, limit: 20 });

      const callArgs = (mockRepo.findPagedByTenant as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('tenant_B');
    });
  });
});
