# Implementation Plan: CreateProperty Use Case Unit Tests

**Branch**: `test/create-property-use-case` | **Date**: 2026-05-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/026-create-property-tests/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add Jest unit tests for `CreatePropertyUseCase` — the application-layer class that delegates property creation to `PropertyRepository`. Tests verify delegation correctness, `tenantId` forwarding, and error propagation. No new production code is introduced. The test file lives alongside the use case at `apps/api/src/modules/properties/application/use-cases/create-property.use-case.spec.ts`. All tests run offline — no Prisma, database, Clerk, Redis, or Docker required.

## Technical Context

**Language/Version**: TypeScript 5.0, Node.js 18+
**Primary Dependencies**: Jest 29, ts-jest 29, @nestjs/testing (not required for this task — direct instantiation used)
**Storage**: N/A — PropertyRepository is mocked; no database involved
**Testing**: Jest 29 + ts-jest 29 (already configured in `apps/api/jest.config.ts`)
**Target Platform**: Node.js — runs entirely in-process
**Project Type**: NestJS modular monolith unit test (application layer only)
**Performance Goals**: < 3s for the full spec file (Jest in-process; no DB round-trips)
**Constraints**: No PrismaService, `@prisma/client`, NestJS TestingModule, or real external services; must not change production files; must keep 37 existing tests passing
**Scale/Scope**: 1 new file, 0 modified production files; 7 test cases

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Architecture**

- [x] Module follows four-layer Clean Architecture — test targets application layer only; does not cross into infrastructure or presentation
- [x] Domain layer imports no NestJS or Prisma packages — domain entity `Property` is imported as a plain interface; no violation
- [x] Controllers are thin — N/A (no controller changes)
- [x] Cross-module interaction uses explicit interfaces only — test depends only on `PropertyRepository` interface, not `PrismaPropertyRepository`

**Multi-Tenancy (CRITICAL)**

- [x] All new DB tables include `tenant_id` — N/A (no schema changes)
- [x] All repository queries filter by `tenant_id` — tested: assert `repository.create` receives `tenantId` from input
- [x] Request context injected via guard — N/A (unit test; guard behavior is out of scope; test documents that `tenantId` arrives via use case input, not request)

**Authentication & Authorization**

- [x] Clerk JWT verified against JWKS — N/A (no auth changes; documented in test that Clerk is not involved)
- [x] Role/permission checks enforced in backend — N/A

**Data Layer**

- [x] All DB access through repository interfaces — test instantiates use case with mocked `PropertyRepository`; no direct Prisma access
- [x] Prisma schema changes include `tenant_id` index — N/A (no schema changes)

**API & Async**

- [x] All new endpoints documented with Swagger — N/A (no new endpoints)
- [x] All DTOs use `class-validator` — N/A (no DTO changes)
- [x] Heavy operations offloaded to BullMQ — N/A
- [x] BullMQ jobs are idempotent — N/A

**Testing**

- [x] Unit tests cover application layer logic — this IS the unit test task; 7 test cases covering delegation, tenantId forwarding, all field passing, no-other-method side effects, and error propagation
- [x] Integration tests — N/A for this scope; repository integration tests are future work
- [x] E2E tests — N/A for this scope

**Security**

- [x] No secrets or credentials in source code — test data uses fake values (`tenant_test_123`, `property_test_123`)
- [x] Rate limiting — N/A
- [x] All inputs validated — N/A (use case assumes pre-validated input from guard + DTO)

**Constitution Check Result**: PASS — all applicable gates satisfied; no violations

## Project Structure

### Documentation (this feature)

```text
specs/026-create-property-tests/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (changes)

```text
apps/api/src/modules/properties/
└── application/
    └── use-cases/
        ├── create-property.use-case.ts         # EXISTING — no change
        └── create-property.use-case.spec.ts    # NEW (test only)
```

**Files explicitly NOT changed**:

- `properties.module.ts` — no change
- `properties.controller.ts` — no change
- `create-property.dto.ts` — no change
- `property-response.dto.ts` — no change
- `prisma-property.repository.ts` — no change
- Any domain entity or repository interface file

**Structure Decision**: Test co-located with the use case per established project convention (see `apps/api/src/modules/users/application/use-cases/get-current-user.use-case.spec.ts`).

## Complexity Tracking

No constitution violations. No unjustified complexity.
