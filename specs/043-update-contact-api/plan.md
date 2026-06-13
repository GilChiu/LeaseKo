# Implementation Plan: Update Renter Contact API

**Branch**: `sprint/003` | **Date**: 2026-06-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/043-update-contact-api/spec.md`

## Summary

Add a `PATCH /api/v1/contacts/:id` endpoint to the existing `contacts` module that partially updates an active renter contact scoped to the authenticated workspace. Only supplied fields are modified; omitted fields are left unchanged. Email uniqueness (case-insensitive, excluding the contact being updated) is enforced in the use case. Non-existent, cross-tenant, and archived contacts return identical 404. No schema changes.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20.x
**Primary Dependencies**: NestJS 10, Prisma 5, class-validator, class-transformer, @nestjs/swagger
**Storage**: PostgreSQL (via existing `PrismaService`)
**Testing**: Jest (unit, integration, E2E)
**Target Platform**: Linux server — additive change only
**Performance Goals**: < 2 seconds end-to-end per SC-001
**Constraints**: Partial update (only supplied fields change); empty body rejected; email uniqueness excludes self; `tenantId` never updatable; all inaccessible contacts return identical 404; no schema changes
**Scale/Scope**: One new `PATCH /:id` route, one new use case, one new DTO, one repository method — no schema changes

## Constitution Check

**Architecture**

- [x] Additive to existing four-layer `contacts` module
- [x] `UpdateTenantContactUseCase` delegates to repository — no Prisma in use case
- [x] Controller remains thin — no business logic

**Multi-Tenancy (CRITICAL)**

- [x] `update(id, tenantId, data)` uses compound WHERE `{ id, tenantId }` — cross-tenant mutations impossible
- [x] `tenantId` from `@CurrentTenant()` only — never from body or path

**Authentication & Authorization**

- [x] `@RequiresTenant()` on `PATCH /:id` — 403 if no active workspace

**Data Layer**

- [x] `update` implemented only in `PrismaTenantContactRepository`
- [x] No schema changes needed

**API & Async**

- [x] Full Swagger decorators on the new route
- [x] `UpdateTenantContactDto` uses `@IsOptional` variants + `@IsNotEmpty` to allow partial updates while blocking blank fields
- [x] No BullMQ needed — update is synchronous

**Testing**

- [x] Unit test: `UpdateTenantContactUseCase` — partial update, email self-match, email conflict, not found
- [x] Integration test: `update` in `PrismaTenantContactRepository`
- [x] E2E: `PATCH /contacts/:id` — success, partial, empty body, email conflict, 404 cases

> **Constitution Check Result**: PASS — no violations.

## Project Structure

### Documentation

```text
specs/043-update-contact-api/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/openapi.md
└── tasks.md
```

### Source Code (additive)

```text
apps/api/src/modules/contacts/
├── application/
│   ├── repositories/
│   │   └── tenant-contact.repository.ts        # ADD update method
│   ├── types/
│   │   └── tenant-contact-repository.types.ts  # ADD UpdateTenantContactInput
│   └── use-cases/
│       └── update-tenant-contact.use-case.ts   # NEW FILE
├── infrastructure/
│   └── repositories/
│       └── prisma-tenant-contact.repository.ts  # ADD update implementation
└── presentation/
    ├── dto/
    │   └── update-tenant-contact.dto.ts         # NEW FILE
    └── contacts.controller.ts                   # ADD PATCH /:id route
    # contacts.module.ts                         # Register new use case
```

## Complexity Tracking

> No violations.
