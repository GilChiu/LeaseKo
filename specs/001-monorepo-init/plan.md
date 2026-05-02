# Implementation Plan: Monorepo Initialization

**Branch**: `001-monorepo-init` | **Date**: 2026-05-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-monorepo-init/spec.md`

## Summary

Initialize a production-ready pnpm + Turborepo monorepo containing a Next.js 14 frontend (`apps/web`) and a NestJS 10 backend (`apps/api`), with shared TypeScript/ESLint configuration (`packages/config`) and Docker-based local infrastructure (PostgreSQL 16 + Redis 7). The implementation establishes the full developer environment baseline — a single `pnpm install` + `pnpm dev` brings everything online. No business logic, Clerk auth, or Prisma integration is included in this phase; only the structural foundation and tooling plumbing.

## Technical Context

**Language/Version**: TypeScript 5.x (both apps)
**Primary Dependencies**: Next.js 14+ (frontend), NestJS 10+ (backend), pnpm 9+ (package manager), Turborepo 2.x (build system), Docker Compose v2 (infrastructure)
**Storage**: PostgreSQL 16-alpine (containerized, provisioned only), Redis 7-alpine (containerized, provisioned only) — neither is wired to application code in this phase
**Testing**: Jest (configured in both apps, no test cases written in this phase)
**Target Platform**: Developer workstation (macOS / Windows / Linux) with Docker Desktop
**Project Type**: Monorepo (web application + API service)
**Performance Goals**: Local dev startup < 10 seconds; incremental Turborepo-cached builds < 5 seconds on unchanged apps
**Constraints**: pnpm only (no npm/yarn); single `pnpm install` at root installs everything; no hardcoded environment values; Node.js LTS v20+
**Scale/Scope**: Foundation for a multi-tenant SaaS; 2 apps, 1 shared config package, 1 infra compose file; ~50 files total at completion

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

> **Scope note**: This feature is infrastructure scaffolding only. No business logic, endpoints, database tables, or authentication flows are implemented. Constitution checks that are not triggered by the scope of this feature are marked N/A with justification. All applicable checks pass.

**Architecture**

- [x] Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation`
      — Folder structure scaffolded per module in `apps/api/src/modules/`. No logic present yet.
- [x] Domain layer imports no NestJS or Prisma packages
      — No domain code written; structure is empty directories.
- [x] Controllers are thin — all logic delegated to use cases
      — Only a health-check controller is created; it has no logic.
- [x] Cross-module interaction uses explicit interfaces or events only (no direct internal imports)
      — No cross-module interaction in this phase.

**Multi-Tenancy (CRITICAL)**

- N/A All new DB tables include `tenant_id` column with index
  — No DB tables are created in this phase. Prisma is not installed.
- N/A All repository queries filter by `tenant_id` — no unscoped queries
  — No queries exist in this phase.
- N/A Request context (`userId`, `tenantId`, `role`) is injected via guard before any business logic
  — No guards or business logic in this phase.

**Authentication & Authorization**

- N/A Clerk JWT is verified against JWKS — client-supplied identity is never trusted
  — Clerk is not integrated in this phase. Structure is prepared.
- N/A Role/permission checks are enforced in backend guards, not in frontend
  — No auth logic in this phase.

**Data Layer**

- N/A All DB access goes through repository interfaces (no direct Prisma usage in application/domain/presentation)
  — Prisma is not installed in this phase.
- N/A Prisma schema changes include `tenant_id` index on affected models
  — No schema in this phase.

**API & Async**

- N/A All new endpoints are documented with Swagger/OpenAPI decorators
  — No feature endpoints added. Swagger setup is scaffolded (configuration only, no endpoint docs).
- N/A All DTOs use `class-validator` decorators for strict validation
  — No DTOs in this phase.
- N/A Heavy/non-critical operations are offloaded to BullMQ with `tenantId` + `userId` in job payload
  — No async operations in this phase.
- N/A BullMQ jobs are idempotent
  — No jobs in this phase.

**Testing**

- N/A Unit tests cover domain and application layer logic
  — No domain or application logic exists yet. Jest is configured.
- N/A Integration tests cover repository and module interactions
  — No repositories in this phase.
- N/A E2E tests cover new API endpoints with auth + tenant context
  — No feature endpoints in this phase.

**Security**

- [x] No secrets or credentials in source code
      — `.env.example` documents all variables. All values are read from environment. No defaults committed.
- N/A Rate limiting applied to new public-facing endpoints
  — The only endpoint is `/health` which is an internal liveness check, not a public API.
- [x] All inputs validated and sanitised before processing
      — No user inputs accepted in this phase.

## Project Structure

### Documentation (this feature)

```text
specs/001-monorepo-init/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
LeaseKo/                              # monorepo root
├── apps/
│   ├── web/                          # Next.js 14 frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── (auth)/           # route group — login/signup (Clerk, future)
│   │   │   │   └── (dashboard)/      # route group — protected pages (future)
│   │   │   ├── components/
│   │   │   │   └── ui/
│   │   │   └── lib/
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tsconfig.json             # extends packages/config/tsconfig/base.json
│   │   ├── .eslintrc.js              # extends @leaseKo/eslint-config
│   │   └── package.json              # name: @leaseKo/web
│   │
│   └── api/                          # NestJS 10 backend
│       ├── src/
│       │   ├── modules/              # feature modules (empty scaffold)
│       │   │   ├── health/
│       │   │   │   ├── health.controller.ts
│       │   │   │   └── health.module.ts
│       │   │   └── .gitkeep
│       │   ├── common/               # guards, filters, decorators (empty scaffold)
│       │   │   └── .gitkeep
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── test/
│       ├── tsconfig.json             # extends packages/config/tsconfig/base.json
│       ├── tsconfig.build.json
│       ├── nest-cli.json
│       ├── .eslintrc.js              # extends @leaseKo/eslint-config
│       └── package.json              # name: @leaseKo/api
│
├── packages/
│   └── config/                       # shared tooling config
│       ├── tsconfig/
│       │   ├── base.json             # shared TS compiler options
│       │   ├── nextjs.json           # Next.js-specific overrides
│       │   └── nestjs.json           # NestJS-specific overrides (decorators, metadata)
│       ├── eslint/
│       │   └── index.js              # shared ESLint rules
│       └── package.json              # name: @leaseKo/config
│
├── infra/
│   ├── docker-compose.yml            # PostgreSQL 16 + Redis 7
│   └── .env.docker                   # compose-specific env var overrides
│
├── turbo.json                        # Turborepo task pipeline (tasks key, v2 syntax)
├── pnpm-workspace.yaml               # workspace: apps/*, packages/*
├── package.json                      # root scripts: dev, build, lint, format, db:up, db:down
├── tsconfig.json                     # root tsconfig (references only, not compiled directly)
├── .eslintrc.js                      # root eslint config
├── .gitignore
├── .env.example                      # all required variables documented
└── README.md
```

**Structure Decision**: Option 2 (web application) — `apps/` for runnable applications, `packages/` for shared tooling. The NestJS app does not use NestJS CLI monorepo mode; it is a standalone NestJS application inside a pnpm/Turborepo workspace. This avoids `nest-cli.json` project array confusion when Turborepo is the orchestrator.

## Complexity Tracking

No constitution violations. All applicable checks pass. The N/A items are justified by feature scope (scaffolding only — no DB tables, auth, endpoints, or async processing).
