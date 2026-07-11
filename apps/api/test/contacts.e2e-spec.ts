import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import request from 'supertest';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { IRequestContext } from '../src/common/types/request-context.type';
import { DatabaseModule } from '../src/database/prisma/prisma.module';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { ContactsModule } from '../src/modules/contacts/contacts.module';

const TEST_TENANT_A = `e2e-tenant-a-${Date.now()}`;
const TEST_TENANT_B = `e2e-tenant-b-${Date.now()}`;
const TEST_ORG_A = `org_e2e_a_${Date.now()}`;
const TEST_ORG_B = `org_e2e_b_${Date.now()}`;

/** Mock guard injects a configurable tenant context — avoids real Clerk JWT verification. */
let activeTenantId: string = TEST_TENANT_A;

@Injectable()
class MockClerkGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user: IRequestContext }>();
    req.user = {
      userId: 'user_e2e_001',
      clerkOrgId: 'org_e2e',
      tenantId: activeTenantId,
      tenantContactId: null,
      role: 'landlord',
    };
    return true;
  }
}

/**
 * E2E tests for POST /api/v1/contacts and GET /api/v1/contacts.
 *
 * Requires a running PostgreSQL database (DATABASE_URL env var).
 * Run: pnpm db:up && pnpm --filter @leaseKo/api test:e2e
 *
 * Auth is mocked via MockClerkGuard — no real Clerk JWTs needed.
 */
describe('ContactsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, ContactsModule],
      providers: [
        {
          provide: APP_GUARD,
          useClass: MockClerkGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalExceptionFilter('test'));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    await prisma.tenant.create({
      data: { id: TEST_TENANT_A, clerkOrgId: TEST_ORG_A, name: 'E2E Tenant A' },
    });
    await prisma.tenant.create({
      data: { id: TEST_TENANT_B, clerkOrgId: TEST_ORG_B, name: 'E2E Tenant B' },
    });
  });

  afterAll(async () => {
    await prisma.tenantContact.deleteMany({
      where: { tenantId: { in: [TEST_TENANT_A, TEST_TENANT_B] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [TEST_TENANT_A, TEST_TENANT_B] } },
    });
    await app.close();
  });

  afterEach(async () => {
    activeTenantId = TEST_TENANT_A;
    await prisma.tenantContact.deleteMany({ where: { tenantId: TEST_TENANT_A } });
    await prisma.tenantContact.deleteMany({ where: { tenantId: TEST_TENANT_B } });
  });

  const validBody = {
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    phone: '+63 912 345 6789',
    idNumber: 'P-12345678A',
    notes: 'Test notes.',
  };

  // ── US1: Successful creation ──────────────────────────────────────────────

  describe('POST /api/v1/contacts — happy path', () => {
    it('201 — returns created contact with all fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.tenantId).toBe(TEST_TENANT_A);
      expect(res.body.firstName).toBe('Alice');
      expect(res.body.lastName).toBe('Smith');
      expect(res.body.email).toBe('alice@example.com');
      expect(res.body.phone).toBe('+63 912 345 6789');
      expect(res.body.idNumber).toBe('P-12345678A');
      expect(res.body.notes).toBe('Test notes.');
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
      expect(res.body.deletedAt).toBeUndefined();
    });

    it('201 — omitted optional fields are absent/null in the response', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send({ firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' })
        .expect(201);

      expect(res.body.phone).toBeNull();
      expect(res.body.idNumber).toBeNull();
      expect(res.body.notes).toBeNull();
    });

    it('201 — email is stored and returned in lowercase', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send({ ...validBody, email: 'Alice@Example.COM' })
        .expect(201);

      expect(res.body.email).toBe('alice@example.com');
    });

    it('201 — tenantId in request body is silently stripped; contact scoped to session', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send({ ...validBody, tenantId: 'attacker-workspace' })
        .expect(201);

      expect(res.body.tenantId).toBe(TEST_TENANT_A);
    });
  });

  // ── US2: Input validation ─────────────────────────────────────────────────

  describe('POST /api/v1/contacts — validation errors', () => {
    it('400 — all three required-field errors returned simultaneously', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      const fields: Array<{ field: string }> = res.body.error.details?.fields ?? [];
      const fieldNames = fields.map((f) => f.field);
      expect(fieldNames).toContain('firstName');
      expect(fieldNames).toContain('lastName');
      expect(fieldNames).toContain('email');
    });

    it('400 — whitespace-only firstName is rejected', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send({ ...validBody, firstName: '   ' })
        .expect(400);
    });

    it('400 — malformed email is rejected', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send({ ...validBody, email: 'not-an-email' })
        .expect(400);
    });

    it('400 — firstName over 100 characters is rejected', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send({ ...validBody, firstName: 'A'.repeat(101) })
        .expect(400);
    });

    it('400 — email over 255 characters is rejected', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send({ ...validBody, email: `${'a'.repeat(246)}@example.com` })
        .expect(400);
    });
  });

  // ── US3: Email uniqueness ─────────────────────────────────────────────────

  describe('POST /api/v1/contacts — email uniqueness', () => {
    it('409 — duplicate email in same workspace is rejected', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send({ ...validBody, firstName: 'Another' })
        .expect(409);

      expect(res.body.error.message).toBe(
        'A contact with this email already exists in this workspace.',
      );
    });

    it('409 — case-insensitive duplicate is rejected (Alice@Example.COM vs alice@example.com)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send({ ...validBody, email: 'ALICE@EXAMPLE.COM' })
        .expect(409);
    });

    it('201 — same email in a different workspace is allowed', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      activeTenantId = TEST_TENANT_B;

      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);
    });
  });

  // ── PATCH /api/v1/contacts/:id — update ──────────────────────────────────

  describe('PATCH /api/v1/contacts/:id — success', () => {
    it('200 — partial update changes only the provided field', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/contacts/${created.body.id}`)
        .set('Authorization', 'Bearer test-token')
        .send({ firstName: 'Alicia' })
        .expect(200);

      expect(res.body.firstName).toBe('Alicia');
      expect(res.body.lastName).toBe('Smith');
      expect(res.body.email).toBe('alice@example.com');
      expect(res.body.deletedAt).toBeUndefined();
    });

    it('200 — email updated to self (same case) is allowed', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/contacts/${created.body.id}`)
        .set('Authorization', 'Bearer test-token')
        .send({ email: 'alice@example.com' })
        .expect(200);
    });

    it('200 — email updated to self (different case) is allowed and stored lowercase', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/contacts/${created.body.id}`)
        .set('Authorization', 'Bearer test-token')
        .send({ email: 'Alice@Example.COM' })
        .expect(200);

      expect(res.body.email).toBe('alice@example.com');
    });
  });

  describe('PATCH /api/v1/contacts/:id — validation', () => {
    it('400 — empty body is rejected', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/contacts/${created.body.id}`)
        .set('Authorization', 'Bearer test-token')
        .send({})
        .expect(400);
    });

    it('400 — whitespace-only firstName is rejected', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/contacts/${created.body.id}`)
        .set('Authorization', 'Bearer test-token')
        .send({ firstName: '   ' })
        .expect(400);
    });

    it('409 — email conflict with a different active contact', async () => {
      const a = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      const b = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send({ firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/contacts/${b.body.id}`)
        .set('Authorization', 'Bearer test-token')
        .send({ email: a.body.email })
        .expect(409);
    });
  });

  describe('PATCH /api/v1/contacts/:id — not found', () => {
    it('404 — non-existent id', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/contacts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer test-token')
        .send({ firstName: 'X' })
        .expect(404);
    });

    it('404 — cross-tenant id', async () => {
      activeTenantId = TEST_TENANT_B;
      const created = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      activeTenantId = TEST_TENANT_A;
      await request(app.getHttpServer())
        .patch(`/api/v1/contacts/${created.body.id}`)
        .set('Authorization', 'Bearer test-token')
        .send({ firstName: 'X' })
        .expect(404);
    });

    it('404 — archived contact', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      await prisma.tenantContact.update({
        where: { id: created.body.id },
        data: { deletedAt: new Date() },
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/contacts/${created.body.id}`)
        .set('Authorization', 'Bearer test-token')
        .send({ firstName: 'X' })
        .expect(404);
    });
  });

  // ── GET /api/v1/contacts — list ───────────────────────────────────────────

  describe('GET /api/v1/contacts — happy path', () => {
    it('200 — returns items, total, page, and limit', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(res.body.items[0].email).toBe('alice@example.com');
      expect(res.body.items[0].deletedAt).toBeUndefined();
    });

    it('200 — empty workspace returns items: [] and total: 0', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
    });

    it('200 — page beyond last returns empty items with correct total', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/v1/contacts?page=99')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(99);
    });

    it('200 — archived contacts are excluded from items and total', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      await prisma.tenantContact.update({
        where: { id: created.body.id },
        data: { deletedAt: new Date() },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('200 — tenantId in query string is ignored; results scoped to session', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/contacts?tenantId=${TEST_TENANT_B}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.body.total).toBe(1);
    });
  });

  // ── GET /api/v1/contacts/:id — get by ID ─────────────────────────────────

  describe('GET /api/v1/contacts/:id — happy path', () => {
    it('200 — returns the full contact record by ID', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/contacts/${created.body.id}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.body.id).toBe(created.body.id);
      expect(res.body.tenantId).toBe(TEST_TENANT_A);
      expect(res.body.firstName).toBe('Alice');
      expect(res.body.email).toBe('alice@example.com');
      expect(res.body.deletedAt).toBeUndefined();
    });
  });

  describe('GET /api/v1/contacts/:id — not found cases (all identical 404)', () => {
    it('404 — non-existent id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/contacts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer test-token')
        .expect(404);
    });

    it('404 — cross-tenant id (contact from workspace B requested by workspace A)', async () => {
      activeTenantId = TEST_TENANT_B;
      const created = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      activeTenantId = TEST_TENANT_A;
      await request(app.getHttpServer())
        .get(`/api/v1/contacts/${created.body.id}`)
        .set('Authorization', 'Bearer test-token')
        .expect(404);
    });

    it('404 — archived contact in same workspace', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(201);

      await prisma.tenantContact.update({
        where: { id: created.body.id },
        data: { deletedAt: new Date() },
      });

      await request(app.getHttpServer())
        .get(`/api/v1/contacts/${created.body.id}`)
        .set('Authorization', 'Bearer test-token')
        .expect(404);
    });

    it('404 — malformed id string', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/contacts/not-a-valid-uuid')
        .set('Authorization', 'Bearer test-token')
        .expect(404);
    });
  });

  describe('GET /api/v1/contacts — pagination validation', () => {
    it('400 — page=0 is rejected', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/contacts?page=0')
        .set('Authorization', 'Bearer test-token')
        .expect(400);
    });

    it('400 — limit=101 is rejected', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/contacts?limit=101')
        .set('Authorization', 'Bearer test-token')
        .expect(400);
    });

    it('400 — limit=0 is rejected', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/contacts?limit=0')
        .set('Authorization', 'Bearer test-token')
        .expect(400);
    });

    it('200 — limit=100 is accepted', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/contacts?limit=100')
        .set('Authorization', 'Bearer test-token')
        .expect(200);
    });
  });

});
