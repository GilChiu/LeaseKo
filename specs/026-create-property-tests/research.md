# Research: CreateProperty Use Case Unit Tests

**Feature**: 026-create-property-tests
**Phase**: 0 — Research
**Date**: 2026-05-09

---

## Overview

This document resolves all design questions for the `CreatePropertyUseCase` unit test suite. The use case itself is already implemented and committed. No production code changes are required.

---

## Decision 1: Test file location

**Decision**: `apps/api/src/modules/properties/application/use-cases/create-property.use-case.spec.ts`

**Rationale**: Project convention is to co-locate spec files alongside the implementation file. Evidence: `apps/api/src/modules/users/application/use-cases/get-current-user.use-case.spec.ts` mirrors its use case. Jest's `testRegex` in `apps/api/jest.config.ts` picks up `*.spec.ts` files automatically.

**Alternatives considered**: Separate `__tests__/` directory — rejected because the existing project pattern does not use it.

---

## Decision 2: Use case instantiation strategy

**Decision**: Direct class instantiation — `new CreatePropertyUseCase(mockRepo)`

**Rationale**: `CreatePropertyUseCase` is a thin delegator with a single constructor argument. NestJS `TestingModule` is unnecessary overhead. Existing convention (`GetCurrentUserUseCase` spec) uses direct instantiation. This keeps tests fast and free of NestJS bootstrap cost.

**Alternatives considered**: `TestingModule` with provider override — rejected because no DI-specific behavior needs testing; the use case has no lifecycle hooks or module-scoped dependencies.

---

## Decision 3: Mock shape for PropertyRepository

**Decision**: Full-interface mock using `jest.fn()` for all 5 methods (`create`, `findManyByTenant`, `findById`, `update`, `softDelete`). Only `create` needs behavior for this test suite.

**Rationale**: Mocking the full interface prevents TypeScript type errors. `jest.clearAllMocks()` in `beforeEach` ensures clean state. Assertions on non-create methods confirm the use case does not cause side effects.

**Alternatives considered**: Partial mock with `Partial<PropertyRepository>` cast — rejected because the full mock is trivially cheap and avoids casting noise.

---

## Decision 4: NestJS TestingModule — use or not

**Decision**: Do NOT use `TestingModule`.

**Rationale**: `CreatePropertyUseCase` has a single constructor injection. Direct instantiation is simpler, faster, and follows the established `get-current-user.use-case.spec.ts` pattern. The `@Inject(PROPERTY_REPOSITORY)` token is a NestJS-only concern at module wiring time — it has no effect when constructing the class directly in tests.

**Alternatives considered**: `TestingModule` with `{ provide: PROPERTY_REPOSITORY, useValue: mockRepo }` — acceptable but over-engineered for this thin use case.

---

## Decision 5: Test data values

**Decision**: Static fake values — `tenant_test_123`, `property_test_123`, fixed `Date` objects (`new Date("2026-05-09T12:00:00.000Z")`).

**Rationale**: Static dates make equality assertions (`toEqual`) deterministic. Real-looking but clearly fake IDs (`*_test_*`) are self-documenting and safe to commit.

**Alternatives considered**: `jest.useFakeTimers()` for Date control — rejected as unnecessary complexity; fixed Date string achieves the same determinism with zero setup cost.

---

## Decision 6: What to assert for tenantId forwarding

**Decision**: Assert `repository.create` was called with `expect.objectContaining({ tenantId: "tenant_test_123" })`.

**Rationale**: `objectContaining` makes the assertion robust to future field additions without breaking. The use case must not alter `tenantId` — the assertion proves it passes through unchanged.

**Alternatives considered**: Full `toHaveBeenCalledWith(mockInput)` — also done in a separate test; both assertions coexist to catch different regression types.

---

## Decision 7: Error propagation test strategy

**Decision**: Assert `await expect(useCase.execute(mockInput)).rejects.toBe(repositoryError)` (identity check).

**Rationale**: `toBe` verifies the exact same Error object is propagated, not just a matching message. This rules out any silent wrapping or swallowing. A second assertion with `.toThrow("Repository failure")` adds message-level coverage.

**Alternatives considered**: Only `toThrow` — rejected because it would pass even if the use case wrapped the error in a new `Error` object.

---

## Decision 8: Test count and grouping

**Decision**: 7 test cases inside a single `describe("execute")` block:
1. Returns the Property from the repository
2. Calls `repository.create` exactly once
3. Passes the full input to `repository.create`
4. Forwards `tenantId` from input
5. Does not call any other repository method
6. Propagates repository errors (message check)
7. Propagates the exact error thrown (identity check)

**Rationale**: Each test has a single assertion focus. Separating "calls once" from "called with input" follows the single-assertion principle and produces clearer failure messages. 7 tests is proportionate to a thin use case — not over-tested, not under-tested.

**Alternatives considered**: Combined tests — rejected because combined tests hide which specific behavior broke on failure.

---

## Decision 9: SPRINT-2-BACKLOG.md update timing

**Decision**: Update the backlog only after `npx jest` exits 0 with all tests passing.

**Rationale**: Spec requirement SC-005 and US story text explicitly tie the backlog update to verification passing.

**Alternatives considered**: Update first, then test — rejected; the backlog must reflect actual completion, not intent.
