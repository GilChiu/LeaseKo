# Feature Specification: Clean Architecture Module Structure

**Feature Branch**: `016-clean-arch-module-structure`
**Created**: 2026-05-05
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Developer adds a new feature module without guessing layer placement (Priority: P1)

A new backend developer joins the team and is asked to add a use case to the tenants module. Because each module has standardized `domain / application / infrastructure / presentation` layers with documented rules, they immediately know where their code belongs — no debates, no guessing, and no drift toward anti-patterns.

**Why this priority**: This is the core value of the feature. Without clear layer structure, every module diverges and technical debt accumulates rapidly.

**Independent Test**: Can be verified by confirming the tenants module has four named layer directories, each containing only layer-appropriate files, and that a code review of any new file can cite an explicit layer rule it follows.

**Acceptance Scenarios**:

1. **Given** a developer needs to add a repository method to the tenants module, **When** they browse `modules/tenants/`, **Then** they find an `application/repositories/` folder containing the interface and an `infrastructure/repositories/` folder containing the Prisma implementation.
2. **Given** a developer needs to add a new tenant-related endpoint, **When** they browse `modules/tenants/`, **Then** they find a `presentation/` folder with a controller and DTO files.
3. **Given** a developer needs to add a tenant domain entity, **When** they browse `modules/tenants/domain/`, **Then** they find an `entities/` subfolder and no imports from NestJS, Prisma, or HTTP packages.

---

### User Story 2 — Developer adds a new business module following an established template (Priority: P2)

When the time comes to implement the Properties module (or Units, Leases, Payments), a developer can copy the standard four-layer module template, fill in their domain logic, and trust that the architecture conventions are already in place.

**Why this priority**: The long-term scalability of the system depends on repeatable module patterns. Without a template, each new module risks ad hoc structure.

**Independent Test**: A documented module template exists (`docs/backend-architecture.md`) describing the required folder structure, and a developer can scaffold a new module directory matching that template without any additional guidance.

**Acceptance Scenarios**:

1. **Given** `docs/backend-architecture.md` exists, **When** a developer reads the "Future Module Template" section, **Then** they find a complete folder tree and layer responsibility table they can replicate for any new module.
2. **Given** a new `modules/properties/` directory is scaffolded, **When** it is reviewed, **Then** it contains `domain/`, `application/`, `infrastructure/`, `presentation/`, and `properties.module.ts` — matching the documented template.

---

### User Story 3 — Tech lead audits the codebase for Prisma isolation and confirms zero violations (Priority: P2)

A tech lead wants assurance that no business logic directly imports `PrismaService` or `@prisma/client`. Running a single grep confirms all Prisma usage is confined to `database/prisma/` and `*/infrastructure/repositories/`.

**Why this priority**: Prisma isolation is a hard architectural boundary — any violation means business logic is tightly coupled to the persistence layer, making testing and refactoring painful.

**Independent Test**: Running `grep -r "PrismaService\|@prisma/client" apps/api/src` and filtering out the allowed paths returns zero results.

**Acceptance Scenarios**:

1. **Given** the full codebase, **When** searching for `PrismaService` imports, **Then** only `database/prisma/` and `*/infrastructure/repositories/` files contain them.
2. **Given** a domain entity file, **When** inspecting its imports, **Then** no `@prisma/client` types appear.
3. **Given** an application use case file, **When** inspecting its imports, **Then** no `PrismaService` or `@prisma/client` imports appear.

---

### User Story 4 — QA engineer runs the backend test suite and confirms all tests pass with zero build errors (Priority: P1)

After the structural reorganization, the backend must compile cleanly, all existing tests must pass, and no regressions are introduced. The refactor is purely structural — no working behavior is changed.

**Why this priority**: Any structural reorganization that breaks the build or tests is unacceptable. Preserving behavior is a non-negotiable constraint.

**Independent Test**: Running `pnpm --filter @leaseKo/api typecheck && pnpm --filter @leaseKo/api build && pnpm --filter @leaseKo/api test` all exit with code 0.

**Acceptance Scenarios**:

1. **Given** any file moves or imports updated, **When** TypeScript compiler runs, **Then** zero errors are reported.
2. **Given** the full test suite, **When** Jest runs, **Then** all existing tests pass.
3. **Given** the NestJS build, **When** `nest build` runs, **Then** it succeeds and produces a valid dist output.

---

### User Story 5 — Developer adds a cross-cutting concern (guard, decorator, filter) and knows exactly where it lives (Priority: P3)

When adding a new global guard or a shared decorator, a developer knows to place it in `common/guards/` or `common/decorators/` rather than inside any specific module. The `common/` folder has a documented purpose and clear rules preventing it from becoming a catch-all dumping ground.

**Why this priority**: The `common/` folder is secondary to the per-module layer structure but important for preventing scattered cross-cutting infrastructure.

**Independent Test**: The `common/` folder contains only the directories listed in the spec (`decorators`, `guards`, `interceptors`, `filters`, `middleware`, `pipes`, `types`, `utils`), and no domain-specific business logic appears in any of them.

**Acceptance Scenarios**:

1. **Given** a new `TenantGuard` is needed, **When** the developer places it, **Then** it lives in `common/guards/` or in the tenants module's own `application/` layer — not in `common/` domain logic.
2. **Given** the `common/` folder is reviewed, **When** checking for domain-specific imports, **Then** no module-specific business types are imported by common utilities.

---

### Edge Cases

- What happens if a file currently exists at the wrong layer (e.g., a Prisma repository in an `application/` folder)? → It must be moved to `infrastructure/repositories/` and imports updated.
- How does the system handle NestJS modules that do not yet have domain entities? → The `domain/` folder may be empty initially but must still exist to enforce the template.
- What if an existing guard in `common/` contains tenant-specific logic? → Evaluate whether it belongs in `common/guards/` (cross-cutting) or should be moved to `modules/tenants/application/`.
- What if the auth module already has some files in non-standard locations? → Move them to the correct layer; update all imports; preserve behavior.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Each business module (`auth`, `tenants`) MUST contain exactly four layer subdirectories: `domain/`, `application/`, `infrastructure/`, `presentation/`.
- **FR-002**: The `domain/` layer MUST NOT contain any imports from NestJS decorators, Prisma, HTTP packages, or external SDK libraries.
- **FR-003**: The `application/` layer MUST NOT import `PrismaService` or any `@prisma/client` types directly.
- **FR-004**: The `presentation/` layer MUST NOT contain business logic; controllers MUST delegate to application use cases or services.
- **FR-005**: The `infrastructure/` layer MUST be the only layer (outside `database/prisma/`) permitted to import `PrismaService` or `@prisma/client`.
- **FR-006**: The `common/` folder MUST contain only cross-cutting infrastructure subdirectories: `config/`, `decorators/`, `filters/`, `guards/`, `interceptors/`, `middleware/`, `pipes/`, `types/`, `utils/`.
- **FR-007**: The `database/prisma/` folder MUST remain separated from all business modules.
- **FR-008**: All existing tests MUST continue to pass after any file reorganization.
- **FR-009**: All existing imports MUST be updated if any files are moved.
- **FR-010**: Architecture documentation MUST exist at `docs/backend-architecture.md` covering: module structure, layer responsibilities, allowed dependencies, forbidden dependencies, Prisma rules, and a future module template.
- **FR-011**: The auth module MUST be organized with the four-layer structure and own Clerk-related infrastructure (JWT verification adapter).
- **FR-012**: The tenants module MUST be organized with the four-layer structure; repository interfaces in `application/repositories/` and Prisma implementations in `infrastructure/repositories/`.
- **FR-013**: Modules MUST NOT directly import another module's infrastructure layer.
- **FR-014**: Dependency direction MUST follow: `presentation → application → domain`; `infrastructure → application / domain`.
- **FR-015**: A reusable future-module template MUST be documented so any new module (`properties`, `units`, `leases`, `payments`) can follow the same structure without additional guidance.

### Key Entities

- **Module**: A NestJS business module (e.g., `auth`, `tenants`) that encapsulates a single bounded context across four layers.
- **Layer**: A subdirectory within a module enforcing a specific responsibility boundary (`domain`, `application`, `infrastructure`, `presentation`).
- **Common**: A shared cross-cutting folder containing only reusable infrastructure utilities, guards, decorators, filters, and types with no domain-specific logic.
- **Architecture Document**: `docs/backend-architecture.md` — the canonical reference for module structure, layer rules, and the future module template.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every business module directory contains exactly the four layer subdirectories (`domain/`, `application/`, `infrastructure/`, `presentation/`) — verifiable by directory listing.
- **SC-002**: Zero `PrismaService` or `@prisma/client` import statements exist outside `database/prisma/` and `*/infrastructure/repositories/` — verifiable by grep.
- **SC-003**: Zero controllers contain direct business logic — verifiable by code review confirming all controller methods call use cases or services.
- **SC-004**: All existing automated tests pass (100% pass rate) after reorganization — verifiable by test runner output.
- **SC-005**: TypeScript compilation reports zero errors after reorganization — verifiable by typecheck command exit code 0.
- **SC-006**: `docs/backend-architecture.md` exists and contains all required sections (module structure, layer responsibilities, dependency rules, Prisma rules, future module template) — verifiable by document review.
- **SC-007**: A new team member can scaffold a future module directory matching the documented template in under 5 minutes — verifiable by following only the template documentation with no other guidance.

---

## Assumptions

- The existing `auth` and `tenants` modules already contain some files; this feature reorganizes them into the correct layer structure without rewriting working logic.
- The `database/prisma/` folder and `PrismaService` are already implemented and globally provided via `@Global()` `DatabaseModule` — this feature does not change them.
- Clerk authentication behavior (JWT verification, guard logic, user/tenant context extraction) is working and must be preserved exactly.
- Repository abstraction (interfaces + Prisma implementations) from feature 015 is already in place for `users` and `tenants` — this feature standardizes surrounding structure without replacing those files.
- The `common/` folder may already contain some files (guards, decorators, utilities); this feature ensures they are in the correct subdirectory and removes any domain-specific logic from `common/`.
- No new business features (Properties, Units, Leases, Payments) will be implemented as part of this feature — only structural organization.
- All commands are run via `pnpm --filter @leaseKo/api <script>` from the monorepo root.
- Lint configuration (`eslint`) is already in place; this feature must not introduce lint violations but does not need to add new lint rules.
