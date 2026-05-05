# Research: Clean Architecture Module Structure

**Feature**: 016-clean-arch-module-structure
**Date**: 2026-05-05

All research decisions are resolved from existing codebase analysis (features 012–015). No external research was required — the current state was fully inventoried before planning.

---

## Decision 1: How much of the Clean Architecture is already in place?

**Decision**: Most of it — the major layers are already implemented for `auth`, `tenants`, and `users`. Only scaffolding and two file moves are needed.

**Rationale**: Feature 015 (Prisma Repository Abstraction) already established `application/repositories/`, `infrastructure/repositories/`, and `application/use-cases/` in users and tenants. Feature 008 established `auth/application/` and `auth/infrastructure/`. The gaps are: missing `domain/` directories, missing `presentation/dto/` scaffolds, and two controllers (`health`, `system`) still at their module root instead of in `presentation/`.

**Alternatives considered**: Full rewrite of layer structure from scratch — rejected; working code exists and must not be rewritten unnecessarily.

---

## Decision 2: Should `health.controller.ts` and `system.controller.ts` be moved?

**Decision**: Yes — move both to `presentation/` layer inside their respective modules.

**Rationale**: These controllers are at the module root (e.g., `modules/health/health.controller.ts`) instead of inside `modules/health/presentation/`. The `presentation/dto/` subfolder for both already exists at the correct path. Moving controllers aligns the full four-layer template across all modules.

**Alternatives considered**: Leave them at module root — rejected; inconsistency breaks the template and confuses developers adding new files.

---

## Decision 3: Should `health.controller.spec.ts` move with the controller?

**Decision**: No — keep the spec at the module root (`modules/health/health.controller.spec.ts`). Only update its import path.

**Rationale**: Jest discovers test files by glob pattern regardless of nesting depth. Moving spec files creates unnecessary churn and risks losing test history. The import path update is trivial.

**Alternatives considered**: Move spec to `presentation/` alongside the controller — rejected; no practical benefit and spec files are commonly placed at module root.

---

## Decision 4: Do `domain/` directories need content in this feature?

**Decision**: No — scaffold with `.gitkeep` only. No domain entities are added in this feature.

**Rationale**: The feature goal is structural standardization. Domain entities (`Tenant`, `User`, `Property`, etc.) will be added when the corresponding use cases require them. Creating empty entity files now would be premature and potentially incorrect.

**Alternatives considered**: Create placeholder domain entity classes — rejected; adds untested stubs that might be wrong when actually needed.

---

## Decision 5: Do utility modules (`health`, `system`, `tenant-context`) need use cases?

**Decision**: No — these modules have thin controllers that directly return request context data. Use case indirection adds no value here.

**Rationale**:
- `HealthController.check()` returns a static `{ status: "ok", service: "api", timestamp }` — no business logic
- `SystemController.me()` returns `req.user.userId` — thin passthrough
- `TenantContextController.getTenantContext()` returns `tenantId` from request — thin passthrough

**Alternatives considered**: Add use cases for all controllers for consistency — rejected; the constitution says controllers should delegate to use cases, but also says avoid over-engineering. For read-only, stateless passthrough of request context, a use case layer is unnecessary complexity.

---

## Decision 6: Where should `ITenantScopedRepository<T>` live?

**Decision**: Keep in `common/repositories/` — it is a genuinely cross-cutting base interface used by future business modules.

**Rationale**: The spec says `common/` should not list `repositories/` as a subdirectory. However, `ITenantScopedRepository<T>` is shared infrastructure used by multiple future modules (Properties, Units, Leases). Placing it in `common/repositories/` is appropriate — it is not domain-specific.

**Alternatives considered**: Move to `shared/` — rejected; `shared/` currently holds only DTOs. The `common/` placement is correct for shared infrastructure interfaces.

---

## Decision 7: Should `shared/dto/error-response.dto.ts` be moved to `common/`?

**Decision**: No — keep `shared/dto/error-response.dto.ts` in place.

**Rationale**: The `SystemController` imports `ErrorResponseDto` from `../../shared/dto/`. Moving this file would require updating that import. The file is not domain-specific and the `shared/` folder serves as a cross-cutting shared types layer — semantically equivalent to `common/`. No benefit in moving it.

**Alternatives considered**: Merge `shared/` into `common/` — deferred; out of scope for this feature.

---

## Decision 8: Should `stub-bearer.guard.ts` be deleted?

**Decision**: No — keep it as deprecated. Do not delete it in this feature.

**Rationale**: The guard is marked `@deprecated` in its JSDoc. Deleting it requires confirming it is not imported anywhere. Deletion is out of scope for a structural feature — it should be handled as a separate cleanup task.

**Alternatives considered**: Delete the file now — rejected; could break an import we haven't traced; out of scope.

---

## Decision 9: What file-move approach is safest?

**Decision**: Move one file at a time; run `typecheck` after each move.

**Rationale**: Only 2 files are moving. The risk is extremely low. Moving sequentially and typechecking after each ensures any import path error is caught immediately and traced to a single change.

**Alternatives considered**: Move both files simultaneously — acceptable given the tiny scope, but sequential is safer.

---

## Decision 10: Is `docs/backend-architecture.md` the right location for the architecture document?

**Decision**: Yes — `docs/` is the conventional location for project-level architecture documentation.

**Rationale**: `docs/` already contains `data-model.md`, `development.md`, `tenant-isolation.md`, and `data-layer.md`. Adding `backend-architecture.md` follows the same pattern. The file must be linkable from copilot instructions and README.

**Alternatives considered**: `apps/api/ARCHITECTURE.md` — rejected; `docs/` is the established project documentation location.
