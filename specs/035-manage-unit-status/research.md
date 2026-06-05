# Research: Manage Unit Status Lifecycle

**Feature**: `specs/035-manage-unit-status/spec.md`
**Date**: 2026-06-04

---

## Decision Log

### 1. Transition Guard Placement

**Decision**: Transition table in `domain/` as a pure constant; enforcement in `UpdateUnitUseCase` (application layer).

**Rationale**:
- The transition table is pure domain knowledge — no framework, no I/O, no dependencies.
- Placing it in `domain/` keeps it testable in isolation and prevents leakage into infrastructure or presentation.
- The application layer (use case) is the correct place to enforce business rules before delegating to the repository.

**Alternatives Considered**:
- Controller-level guard: rejected — controllers are thin adapters; business rules belong in use cases.
- Repository-level check: rejected — repositories are persistence-only; they must not contain domain logic.
- Database constraint: rejected — a state machine expressed as CHECK constraints is brittle, unreadable, and not auditable in application logs.

---

### 2. HTTP Status Code for Invalid Transitions

**Decision**: `422 Unprocessable Entity` (`UnprocessableEntityException` from `@nestjs/common`).

**Rationale**:
- 400 Bad Request is for syntactically invalid input — the status value itself is valid, but the *transition* is not.
- 409 Conflict is reserved for duplicate-key violations (e.g., duplicate `unitNumber`) — already used by P2002.
- 422 Unprocessable Entity is the standard for "input is syntactically valid but semantically rejected by business rules".
- `@nestjs/common` provides `UnprocessableEntityException` which maps to HTTP 422 out of the box.

**Alternatives Considered**:
- 409 Conflict: rejected — 409 in this codebase means duplicate-key; mixing it with transition violations would confuse callers.
- Custom exception: rejected — NestJS built-ins are sufficient; no custom filter changes needed.

---

### 3. Schema Migration Strategy for INACTIVE

**Decision**: Add `INACTIVE` to the Prisma `UnitStatus` enum and generate a new migration.

**Rationale**:
- The `UnitStatus` enum is defined directly in `schema.prisma` as a PostgreSQL-native enum.
- PostgreSQL `ALTER TYPE ... ADD VALUE` is safe for additive enum changes — existing rows retain their current value.
- No data migration is required; all existing units keep their current status.
- The domain `UnitStatus` type in `unit.entity.ts` must be updated in the same step.

**Alternatives Considered**:
- Store status as a plain `String`: rejected — the existing schema uses an enum and changing it would require a larger migration.
- Separate `inactiveAt` timestamp: rejected — over-engineering; a status enum value is sufficient for this feature's scope.

---

### 4. Same-Status No-Op Handling

**Decision**: If `requestedStatus === currentStatus`, return the current unit immediately without calling `update()`.

**Rationale**:
- Idempotency: callers can safely retry a status update without side effects.
- Performance: skips a write round-trip when nothing would change.
- Correctness: `updatedAt` should not change if no actual modification occurs.

**Alternatives Considered**:
- Treat same-status as a transition violation: rejected — spec FR-005 explicitly requires this to succeed.
- Let `update()` handle it: rejected — would still write to the DB (setting the same value) and advance `updatedAt`.

---

### 5. findById Before Update (Status Guard Path)

**Decision**: When `status` is present in the update input, call `findById` first to read the current status, then apply the transition guard, then call `update()`.

**Rationale**:
- The transition guard requires knowing the current status, which is not in the update input.
- `findById` already exists on `UnitRepository` and is tenant-scoped — no new repository method needed.
- If `findById` returns null (unit not found or cross-tenant), the use case throws `NotFoundException` before the guard even runs — same 404 behavior as before.
- The two-call pattern (findById + update) has a narrow race window; if a concurrent update changes the status between the two calls, the `update()` still succeeds (it applies to whatever state is current at write time). This is acceptable for the current feature scope.

**Alternatives Considered**:
- Pass current status in the request body: rejected — spec requires the backend to read it; client-supplied current status could be stale or manipulated.
- Use a database transaction for read + update: rejected — over-engineering for current scale; the race window is narrow and the consequence is benign.

---

### 6. Combined Update Handling (status + other fields)

**Decision**: When a request includes `status` alongside other field updates, the transition guard runs on the `status` field. If the transition is invalid, the entire request is rejected — no partial write.

**Rationale**:
- Spec FR-010 explicitly requires this: "if the transition is invalid, the entire request is rejected; no partial update is applied."
- The guard runs before `update()` is called, so either all fields are written or none are.

---

### 7. INACTIVE Units and Non-Status Field Updates

**Decision**: The transition guard runs only when `status` is present in the input. Updating other fields on an INACTIVE unit (e.g., `description`) is allowed.

**Rationale**:
- Spec FR-011 and FR-012 distinguish between status-field changes (guarded) and other-field changes (unguarded).
- INACTIVE locks the lifecycle, not the metadata. A landlord may still need to correct a description or rent amount for reporting purposes.

---

## Summary Table

| Decision | Choice | Key Rule |
|---|---|---|
| Transition guard location | `domain/` table + use case enforcement | Clean Architecture: domain logic in domain layer |
| Invalid transition error | HTTP 422 UnprocessableEntityException | Distinct from 400 (validation) and 409 (conflict) |
| INACTIVE addition | Prisma enum migration | Additive enum change — safe, no data migration |
| Same-status update | No-op — return current unit | Idempotency + spec FR-005 |
| Current status source | findById before update | No client-supplied state |
| Partial update with invalid status | Entire request rejected | Spec FR-010 |
| INACTIVE non-status edits | Allowed | Spec FR-011/FR-012 |
