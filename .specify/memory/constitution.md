<!--
SYNC IMPACT REPORT
Version: (none) → 1.0.0 (initial creation from template)
Modified Principles: N/A — initial creation
Added Sections:
  - Core Principles I–X (Backend-First Logic, Modular Monolith, DDD, Clean Architecture,
    Authentication & Authorization, Multi-Tenancy, Repository Pattern, API Design,
    Async Processing, Testing Strategy)
  - Security Principles
  - Observability & Quality
  - Anti-Patterns & Non-Negotiables
Removed Sections: N/A
Templates Updated:
  ✅ .specify/templates/plan-template.md — Constitution Check gates filled with LeaseKo-specific rules
  ✅ .specify/templates/spec-template.md — No structural changes required; gates apply at plan stage
  ✅ .specify/templates/tasks-template.md — No structural changes required; observability tasks covered by Phase N
Deferred TODOs: None
-->

# LeaseKo Constitution

## Core Principles

### I. Backend-First Logic

All business logic MUST reside exclusively in the NestJS backend. The Next.js
frontend is strictly a presentation and client-state layer — it MUST NOT contain
domain rules, validation logic, or data transformation beyond display formatting.
API calls from the frontend MUST treat the backend as the single source of truth.

**Rationale**: Centralising logic in the backend enforces a single enforcement
point for business rules, security, and multi-tenancy constraints.

### II. Modular Monolith Architecture

The system MUST be structured as a single deployable NestJS application organised
into domain modules. Each module MUST represent one bounded context. Module
boundaries MUST be maintained such that any module can be extracted into an
independent microservice without rewriting its core logic.

Bounded contexts: Auth, Users, Organizations, Properties, Units, Leases, Payments,
Maintenance, Notifications.

**Rationale**: Enables startup velocity while preserving a migration path to
microservices as the platform scales.

### III. Domain-Driven Design

Each module MUST own its data, domain logic, and internal interfaces. Cross-module
interaction MUST occur only through explicitly defined interfaces or events — never
via direct imports of another module's internal services. Shared kernel types MUST
live in a dedicated shared package.

**Rationale**: Low coupling ensures modules can evolve, scale, and be extracted
independently.

### IV. Clean Architecture (NON-NEGOTIABLE)

Every backend module MUST follow this four-layer structure:

```
/module-name
  /domain          → entities, value objects, domain rules
  /application     → use cases, application services
  /infrastructure  → Prisma repositories, queues, external APIs
  /presentation    → controllers, DTOs, guards
```

Rules that MUST be enforced:

- Domain layer MUST NOT import from infrastructure or framework packages.
- Controllers MUST be thin — they delegate to use cases and return responses.
- Infrastructure MUST be swappable without touching application or domain layers.

**Rationale**: Protects business logic from framework churn and makes testing
deterministic.

### V. Authentication & Authorization

Clerk is the sole identity provider. The backend MUST verify every Clerk-issued JWT
using Clerk's JWKS endpoint — it MUST NOT trust identity claims from the client
payload. The backend MUST extract `userId` and `orgId` (mapped to `tenantId`) from
the verified JWT and attach them to the request context.

Authorization (roles and permissions) MUST be stored in the application database
and enforced by backend guards. Clerk handles identity only.

Every protected request context MUST carry: `userId`, `tenantId`, `role`.

**Rationale**: Separating identity (Clerk) from authorisation (database) prevents
vendor lock-in on access control and ensures fine-grained permission modelling.

### VI. Multi-Tenancy & Data Isolation (CRITICAL — NON-NEGOTIABLE)

Every database table MUST include a `tenant_id` column. Every query MUST filter by
`tenant_id`. There are NO exceptions.

A query that returns data without a `tenant_id` filter is considered a critical
security failure and MUST be treated as a P0 incident.

**Rationale**: SaaS data isolation is the most critical correctness property of the
system. A single breach exposes one tenant's data to another.

### VII. Repository Pattern (Data Layer)

Prisma MUST be accessed only through repository implementations. Application and
domain layers MUST program against repository interfaces, not Prisma types.
Direct Prisma client calls in controllers, use cases, or domain services are
FORBIDDEN.

All Prisma schemas MUST include indexed `tenant_id` columns on every model.

**Rationale**: Abstracting Prisma behind interfaces keeps business logic framework-
agnostic and enables unit testing without a database.

### VIII. API Design

All API controllers MUST be thin — no business logic, no data transformation
beyond DTOs. DTOs MUST be strictly validated using `class-validator`.
Every API endpoint MUST be documented with Swagger/OpenAPI decorators.
The OpenAPI spec acts as the authoritative contract for all API consumers.

**Rationale**: Thin controllers maintain Clean Architecture discipline; Swagger
ensures the contract is always explicit and machine-readable.

### IX. Asynchronous Processing

All operations that are not synchronously required for the HTTP response MUST be
offloaded to BullMQ queues. This includes emails, notifications, payment
processing, scheduled jobs, and heavy computations.

Every BullMQ job payload MUST include `tenantId` and `userId`. Jobs MUST be
idempotent. Separate queues MUST be used per domain where workloads differ in
priority or scale.

**Rationale**: Async queues prevent blocking the request thread on slow external
operations, enabling horizontal scalability and resilient retry semantics.

### X. Testing Strategy

Tests are categorised by scope:

- **Unit tests**: Cover all domain and application layer logic in isolation.
  External dependencies MUST be mocked.
- **Integration tests**: Cover repository implementations and module interactions
  with a real (or in-memory) database.
- **E2E tests**: Cover API endpoints end-to-end with authentication and tenant
  context applied.

Test coverage for domain and application layers MUST be maintained at a level that
catches regressions before code reaches production.

**Rationale**: Each test tier validates a distinct layer of the architecture,
giving confidence without requiring full-stack execution for every change.

## Security Principles

- Client input MUST NEVER be trusted — all inputs MUST be validated and sanitised.
- Tenant isolation MUST be enforced at every layer: HTTP guard, application service,
  and database query.
- All routes MUST be protected by authentication guards unless explicitly marked
  public.
- Rate limiting MUST be implemented on all public-facing endpoints.
- Secrets MUST be managed via environment variables and MUST NOT be committed to
  source control.

## Observability & Quality

The system MUST include structured logging (JSON format) on all significant
operations. Error tracking MUST capture unhandled exceptions with tenant context
attached. Performance monitoring MUST track request latency and queue depth.

Log entries for multi-tenant operations MUST always include `tenantId` and
`userId` so incidents can be traced to a specific tenant without cross-tenant data
exposure.

## Anti-Patterns & Non-Negotiables

**STRICTLY FORBIDDEN — any occurrence is a blocking review issue:**

- Business logic in the Next.js frontend
- Business logic in NestJS controllers
- Direct Prisma client calls outside repository implementations
- Database queries missing `tenant_id` filter
- Tight coupling between domain modules (direct internal service imports)
- Synchronous handling of heavy or non-critical background tasks
- Trusting Clerk token data without JWKS verification
- Hardcoded secrets or credentials in source code

## Governance

This constitution supersedes all other development practices and coding standards
for the LeaseKo project. Any practice that conflicts with these principles MUST
be resolved in favour of the constitution or escalated for amendment.

**Amendment procedure**: Amendments require a written rationale, explicit version
bump according to semver rules (MAJOR for removals/redefinitions, MINOR for
additions, PATCH for clarifications), and update of the Last Amended date.

**Compliance**: All pull requests MUST verify compliance with the Constitution
Check gates defined in the plan template before implementation begins. Violations
MUST be documented in the Complexity Tracking section of plan.md with justification.

**Version**: 1.0.0 | **Ratified**: 2026-05-01 | **Last Amended**: 2026-05-01
