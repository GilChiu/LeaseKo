import { PrismaService } from '../../../../database/prisma/prisma.service';
import { PrismaTenantContactRepository } from './prisma-tenant-contact.repository';

/**
 * Integration tests for PrismaTenantContactRepository.
 *
 * Requires a running PostgreSQL database (DATABASE_URL env var).
 * Run: pnpm db:up && pnpm --filter @leaseKo/api test
 *
 * Each test run uses a unique tenantId to prevent cross-test contamination.
 * All created records are cleaned up in afterAll.
 */

const DB_AVAILABLE = !!process.env.DATABASE_URL;

const describeOrSkip = DB_AVAILABLE ? describe : describe.skip;

describeOrSkip('PrismaTenantContactRepository (integration)', () => {
  let prisma: PrismaService;
  let repo: PrismaTenantContactRepository;
  const testTenantId = `test-tenant-${Date.now()}`;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repo = new PrismaTenantContactRepository(prisma);

    await prisma.tenant.create({
      data: {
        id: testTenantId,
        clerkOrgId: `org_test_${Date.now()}`,
        name: 'Integration Test Tenant',
      },
    });
  });

  afterAll(async () => {
    await prisma.tenantContact.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } });
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.tenantContact.deleteMany({ where: { tenantId: testTenantId } });
  });

  describe('create', () => {
    it('persists a contact and returns the entity with all fields', async () => {
      const result = await repo.create({
        tenantId: testTenantId,
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        phone: '+63 912 345 6789',
        idNumber: 'P-12345678A',
        notes: 'Test notes.',
      });

      expect(result.id).toBeDefined();
      expect(result.tenantId).toBe(testTenantId);
      expect(result.firstName).toBe('Alice');
      expect(result.lastName).toBe('Smith');
      expect(result.email).toBe('alice@example.com');
      expect(result.phone).toBe('+63 912 345 6789');
      expect(result.idNumber).toBe('P-12345678A');
      expect(result.notes).toBe('Test notes.');
      expect(result.deletedAt).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('persists a contact with only required fields (null optional fields)', async () => {
      const result = await repo.create({
        tenantId: testTenantId,
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@example.com',
        phone: null,
        idNumber: null,
        notes: null,
      });

      expect(result.phone).toBeNull();
      expect(result.idNumber).toBeNull();
      expect(result.notes).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('returns a contact when it exists in the workspace', async () => {
      await repo.create({
        tenantId: testTenantId,
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        phone: null,
        idNumber: null,
        notes: null,
      });

      const result = await repo.findByEmail(testTenantId, 'alice@example.com');

      expect(result).not.toBeNull();
      expect(result!.email).toBe('alice@example.com');
      expect(result!.tenantId).toBe(testTenantId);
    });

    it('returns null for an email that does not exist in the workspace', async () => {
      const result = await repo.findByEmail(testTenantId, 'nobody@example.com');
      expect(result).toBeNull();
    });

    it('returns null for a contact in a different workspace', async () => {
      await repo.create({
        tenantId: testTenantId,
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        phone: null,
        idNumber: null,
        notes: null,
      });

      const result = await repo.findByEmail('other-tenant-id', 'alice@example.com');
      expect(result).toBeNull();
    });

    it('returns null for an archived (soft-deleted) contact', async () => {
      const contact = await repo.create({
        tenantId: testTenantId,
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        phone: null,
        idNumber: null,
        notes: null,
      });

      await prisma.tenantContact.update({
        where: { id: contact.id },
        data: { deletedAt: new Date() },
      });

      const result = await repo.findByEmail(testTenantId, 'alice@example.com');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates only the provided field and returns the entity', async () => {
      const created = await repo.create({ tenantId: testTenantId, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: null, idNumber: null, notes: null });

      const result = await repo.update(created.id, testTenantId, { firstName: 'Alicia' });

      expect(result).not.toBeNull();
      expect(result!.firstName).toBe('Alicia');
      expect(result!.lastName).toBe('Smith');
      expect(result!.email).toBe('alice@example.com');
    });

    it('returns null for a cross-tenant update attempt', async () => {
      const created = await repo.create({ tenantId: testTenantId, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: null, idNumber: null, notes: null });

      const result = await repo.update(created.id, 'other-tenant', { firstName: 'Alicia' });
      expect(result).toBeNull();
    });

    it('returns null for a non-existent id', async () => {
      const result = await repo.update('00000000-0000-0000-0000-000000000000', testTenantId, { firstName: 'Alicia' });
      expect(result).toBeNull();
    });

  });
  // Note: archived-contact rejection on PATCH is enforced by the use case via findById,
  // not by the repository update method. The repository update is a thin DB adapter.

  describe('findById', () => {
    it('returns the entity when the contact exists in the workspace', async () => {
      const created = await repo.create({ tenantId: testTenantId, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: null, idNumber: null, notes: null });

      const result = await repo.findById(created.id, testTenantId);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(created.id);
      expect(result!.tenantId).toBe(testTenantId);
    });

    it('returns null when the id does not exist', async () => {
      const result = await repo.findById('00000000-0000-0000-0000-000000000000', testTenantId);
      expect(result).toBeNull();
    });

    it('returns null when the contact belongs to a different workspace', async () => {
      const created = await repo.create({ tenantId: testTenantId, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: null, idNumber: null, notes: null });

      const result = await repo.findById(created.id, 'other-tenant-id');
      expect(result).toBeNull();
    });

    it('returns null for an archived (soft-deleted) contact', async () => {
      const created = await repo.create({ tenantId: testTenantId, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: null, idNumber: null, notes: null });
      await prisma.tenantContact.update({ where: { id: created.id }, data: { deletedAt: new Date() } });

      const result = await repo.findById(created.id, testTenantId);
      expect(result).toBeNull();
    });
  });

  describe('findPagedByTenant', () => {
    it('returns items and correct total for a workspace with contacts', async () => {
      await repo.create({ tenantId: testTenantId, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: null, idNumber: null, notes: null });
      await repo.create({ tenantId: testTenantId, firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com', phone: null, idNumber: null, notes: null });

      const result = await repo.findPagedByTenant(testTenantId, { page: 1, limit: 20 });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
    });

    it('returns items ordered by createdAt descending (newest first)', async () => {
      await repo.create({ tenantId: testTenantId, firstName: 'First', lastName: 'Created', email: 'first@example.com', phone: null, idNumber: null, notes: null });
      await repo.create({ tenantId: testTenantId, firstName: 'Second', lastName: 'Created', email: 'second@example.com', phone: null, idNumber: null, notes: null });

      const result = await repo.findPagedByTenant(testTenantId, { page: 1, limit: 20 });

      expect(result.items[0].email).toBe('second@example.com');
      expect(result.items[1].email).toBe('first@example.com');
    });

    it('returns empty items and total 0 for an empty workspace', async () => {
      const result = await repo.findPagedByTenant(testTenantId, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('returns empty items for a page beyond the last page, with correct total', async () => {
      await repo.create({ tenantId: testTenantId, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: null, idNumber: null, notes: null });

      const result = await repo.findPagedByTenant(testTenantId, { page: 99, limit: 20 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(1);
    });

    it('applies offset correctly — page 2 skips page 1 items', async () => {
      for (let i = 1; i <= 3; i++) {
        await repo.create({ tenantId: testTenantId, firstName: `Contact${i}`, lastName: 'Test', email: `contact${i}@example.com`, phone: null, idNumber: null, notes: null });
      }

      const page1 = await repo.findPagedByTenant(testTenantId, { page: 1, limit: 2 });
      const page2 = await repo.findPagedByTenant(testTenantId, { page: 2, limit: 2 });

      expect(page1.items).toHaveLength(2);
      expect(page2.items).toHaveLength(1);
      expect(page1.total).toBe(3);
      expect(page2.total).toBe(3);
      const page1Ids = page1.items.map((c) => c.id);
      expect(page1Ids).not.toContain(page2.items[0].id);
    });

    it('excludes archived (soft-deleted) contacts from items and total', async () => {
      const active = await repo.create({ tenantId: testTenantId, firstName: 'Active', lastName: 'Contact', email: 'active@example.com', phone: null, idNumber: null, notes: null });
      const archived = await repo.create({ tenantId: testTenantId, firstName: 'Archived', lastName: 'Contact', email: 'archived@example.com', phone: null, idNumber: null, notes: null });

      await prisma.tenantContact.update({
        where: { id: archived.id },
        data: { deletedAt: new Date() },
      });

      const result = await repo.findPagedByTenant(testTenantId, { page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(active.id);
    });
  });
});
