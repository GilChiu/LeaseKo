# Quickstart: CreateProperty Use Case Unit Tests

**Feature**: 026-create-property-tests
**Date**: 2026-05-09

---

## Prerequisites

- Feature 025 (Create Property Endpoint) must be complete and merged — `CreatePropertyUseCase` must exist
- Node.js 18+ and pnpm installed
- Branch: `test/create-property-use-case`

```powershell
git checkout test/create-property-use-case
```

---

## Step 1: Verify existing use case exists

```powershell
Test-Path apps/api/src/modules/properties/application/use-cases/create-property.use-case.ts
# Expected: True
```

---

## Step 2: Create the test file

**File**: `apps/api/src/modules/properties/application/use-cases/create-property.use-case.spec.ts`

See [data-model.md](data-model.md) for the full file content.

Key rules:
- No `PrismaService` import
- No `@prisma/client` import
- No `NestJS TestingModule`
- Mock repo with `jest.fn()` for all 5 methods
- Direct instantiation: `new CreatePropertyUseCase(mockRepo)`

---

## Step 3: Run the focused test

```powershell
cd apps/api
npx jest create-property.use-case.spec.ts --verbose
```

Expected output: 7 tests passing, exit 0.

---

## Step 4: Run the full test suite

```powershell
npx jest
```

Expected: All tests passing (37 pre-existing + 7 new = 44 total), exit 0.

---

## Step 5: Run build verification

```powershell
npx nest build
```

Expected: exit 0, no TypeScript errors.

---

## Step 6: Update SPRINT-2-BACKLOG.md

Find under `## User Story 8.1`:

```
- [ ] Add unit tests for CreateProperty use case
```

Change to:

```
- [x] Add unit tests for CreateProperty use case
```

---

## Step 7: Commit

```powershell
cd C:\Users\Zared\Projects\LeaseKo
git add apps/api/src/modules/properties/application/use-cases/create-property.use-case.spec.ts
git add SPRINT-2-BACKLOG.md
git add specs/026-create-property-tests/
git commit -m "test(api): add create property use case tests"
```

---

## Troubleshooting

**`Cannot find module './create-property.use-case'`** — Ensure the spec file is in the same directory as the use case.

**`Type '{ create: jest.Mock; ... }' is missing ... from type 'PropertyRepository'`** — Add all interface methods to the mock object.

**Existing tests break** — Run `npx jest` with `--verbose` to isolate the failing suite.

---

## Notes for next tasks

- **Feature 027**: List Properties use case + `GET /properties` endpoint
- **Feature 028**: Get Property by ID + `GET /properties/:id` endpoint
- **PrismaPropertyRepository integration tests** — separate feature, requires real DB
- **PropertiesController E2E tests** — separate feature, requires NestJS app bootstrap
