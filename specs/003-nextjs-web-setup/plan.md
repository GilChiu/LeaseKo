# Implementation Plan: Next.js Web App Setup

**Branch**: `003-nextjs-web-setup` | **Date**: 2026-05-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-nextjs-web-setup/spec.md`

## Summary

Extend the existing `apps/web` Next.js 14 scaffold (created in Feature 001) with Tailwind CSS, a centralized API client, environment validation, a complete folder structure for future domain features, minimal shared UI components, a styled landing page, and a dashboard route placeholder. No business logic, Prisma, or Clerk authentication is introduced. The result is a fully runnable, buildable, and lintable frontend foundation that backend-first development can build upon incrementally.

**Baseline**: Feature 001 already provides `apps/web` with: `package.json` (Next 14, React 18, TypeScript), `tsconfig.json`, `.eslintrc.js`, `next.config.ts`, root `layout.tsx`, root `page.tsx`, `src/app/(auth)/`, `src/app/(dashboard)/`, `src/components/ui/`, `src/lib/.gitkeep`.

**What this feature adds**: Tailwind CSS v3 installation and configuration; `globals.css`; `tailwind.config.ts`; `postcss.config.mjs`; `src/lib/api.ts` (fetch wrapper); `src/lib/env.ts` (env validation); `src/lib/utils.ts`; complete feature and component folder scaffold; `Button`, `Card`, `Input` placeholder components; dashboard page; `(auth)` and `(dashboard)` layout files; updated root layout and landing page with Tailwind styling; `.env.example`.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 14 (App Router)
**Primary Dependencies**: `tailwindcss@^3`, `postcss`, `autoprefixer` (devDependencies); no new runtime dependencies
**Storage**: N/A — frontend only; no database access
**Testing**: Manual verification in browser; `pnpm build` + `pnpm lint` for CI validation; no automated tests in this phase
**Target Platform**: Web browser; Next.js dev server at `http://localhost:3000`
**Project Type**: Next.js frontend application within pnpm + Turborepo monorepo
**Performance Goals**: Dev server starts within 15 seconds; Tailwind CSS purges unused classes in production builds (default with content paths configured)
**Constraints**: No Prisma, no Clerk, no business logic; all env vars via `NEXT_PUBLIC_*`; no hardcoded URLs; Tailwind v3 (not v4 — v4 has a different config API not yet stable); `postcss.config.mjs` (ESM) for Next.js 14 compatibility
**Scale/Scope**: 4 user stories; ~12 new files; extends existing 6-file scaffold; all changes contained in `apps/web/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> **Scope note**: This feature is frontend-only — no NestJS backend code, no DB tables, no Prisma, no BullMQ, no Clerk. All constitution principles apply to the backend; N/A items below reflect that this feature does not touch the backend at all.

**Architecture**
- N/A Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation`
  — This feature modifies `apps/web` (Next.js frontend), not a NestJS backend module. Clean Architecture applies to NestJS modules only.
- N/A Domain layer imports no NestJS or Prisma packages
  — No domain layer in the frontend. The spec explicitly prohibits Prisma imports in `apps/web`.
- N/A Controllers are thin — all logic delegated to use cases
  — No controllers in Next.js. Route files (`page.tsx`) are thin by spec constraint (no business logic).
- N/A Cross-module interaction uses explicit interfaces or events only
  — No cross-module backend interaction.

**Multi-Tenancy (CRITICAL)**
- N/A All new DB tables include `tenant_id` column with index
  — No DB tables created.
- N/A All repository queries filter by `tenant_id` — no unscoped queries
  — No queries.
- N/A Request context (`userId`, `tenantId`, `role`) is injected via guard before any business logic
  — No backend guards in this feature. The frontend API client has an extension point for the Clerk JWT (Epic 2); it does NOT enforce multi-tenancy — that is the backend's responsibility.

**Authentication & Authorization**
- [x] Clerk JWT is verified against JWKS — client-supplied identity is never trusted
  — No Clerk verification in this feature. The spec explicitly defers Clerk to Epic 2. The frontend does not verify JWTs — it only passes them to the backend. The backend (already established) does the JWKS verification.
- [x] Role/permission checks are enforced in backend guards, not in frontend
  — Spec FR-014 explicitly prohibits tenant authorization logic in the frontend. Dashboard layout has a comment noting where Clerk auth protection will be added in Epic 2.

**Data Layer**
- N/A All DB access goes through repository interfaces
  — No DB access in frontend.
- N/A Prisma schema changes include `tenant_id` index
  — No Prisma changes.

**API & Async**
- N/A All new endpoints are documented with Swagger/OpenAPI decorators
  — No new endpoints. Frontend consumes existing endpoints only.
- N/A All DTOs use `class-validator` decorators for strict validation
  — No DTOs. Frontend uses TypeScript interfaces for type safety; runtime validation is client-side only (UX, not security).
- N/A Heavy/non-critical operations are offloaded to BullMQ
  — No async jobs.
- N/A BullMQ jobs are idempotent
  — No jobs.

**Testing**
- N/A Unit tests cover domain and application layer logic
  — No domain or application logic.
- N/A Integration tests cover repository and module interactions
  — No repositories.
- N/A E2E tests cover new API endpoints with auth + tenant context
  — Manual browser verification is sufficient for this scaffold feature. Automated E2E will be added with Cypress/Playwright in a future feature.

**Security**
- [x] No secrets or credentials in source code
  — All env vars are `NEXT_PUBLIC_*` (safe to expose to browser). No secrets are embedded. `env.ts` reads from runtime env — not from source.
- N/A Rate limiting applied to new public-facing endpoints
  — No new endpoints.
- [x] All inputs validated and sanitised before processing
  — No user inputs that reach the backend in this feature. The API client is a pass-through wrapper. Form validation will be added feature by feature in future epics.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code Changes (apps/web)

**Legend**: `[NEW]` = created by this feature | `[MOD]` = modifies Feature 001 file | `[EXIST]` = already exists, no change

```text
apps/web/
├── package.json                          [MOD] + tailwindcss, postcss, autoprefixer
├── tailwind.config.ts                    [NEW]
├── postcss.config.mjs                    [NEW]
├── .env.example                          [NEW] (replaces .env.local.example)
│
└── src/
    ├── app/
    │   ├── layout.tsx                    [MOD] import globals.css, add Tailwind classes
    │   ├── page.tsx                      [MOD] add Tailwind styling to landing page
    │   │
    │   ├── (auth)/
    │   │   └── layout.tsx                [MOD] add ClerkProvider comment placeholder
    │   │
    │   └── (dashboard)/
    │       ├── layout.tsx                [MOD] add sidebar/nav shell + auth comment placeholder
    │       └── dashboard/
    │           └── page.tsx              [NEW] dashboard placeholder page
    │
    ├── components/
    │   ├── ui/
    │   │   ├── button.tsx                [NEW] Button component (Tailwind)
    │   │   ├── card.tsx                  [NEW] Card component (Tailwind)
    │   │   └── input.tsx                 [NEW] Input component (Tailwind)
    │   ├── layout/
    │   │   └── .gitkeep                  [NEW] placeholder for nav/sidebar/header
    │   └── forms/
    │       └── .gitkeep                  [NEW] placeholder for form wrappers
    │
    ├── features/
    │   ├── auth/
    │   │   └── .gitkeep                  [NEW]
    │   ├── dashboard/
    │   │   └── .gitkeep                  [NEW]
    │   ├── properties/
    │   │   └── .gitkeep                  [NEW]
    │   ├── units/
    │   │   └── .gitkeep                  [NEW]
    │   ├── tenants/
    │   │   └── .gitkeep                  [NEW]
    │   ├── leases/
    │   │   └── .gitkeep                  [NEW]
    │   └── payments/
    │       └── .gitkeep                  [NEW]
    │
    ├── lib/
    │   ├── api.ts                        [NEW] centralized fetch wrapper
    │   ├── env.ts                        [NEW] env var validation
    │   └── utils.ts                      [NEW] shared utilities (cn helper)
    │
    ├── types/
    │   └── .gitkeep                      [NEW] shared TypeScript interfaces
    │
    └── styles/
        └── globals.css                   [NEW] Tailwind directives + base styles
```

**Structure Decision**: The `src/features/` tree follows domain-bounded feature folders (properties, units, tenants, leases, payments, auth, dashboard). Each feature owns its own components, hooks, API calls, and types. The `src/components/` tree holds only cross-feature shared UI primitives. Route files in `src/app/` import from `src/features/` — they never contain business logic directly. This matches the spec constraint and the Feature 004+ implementation plan (each domain feature fills its own folder).

## Complexity Tracking

No constitution violations. This is a pure frontend feature — all N/A items are justified by feature scope (no backend, no DB, no auth).

| N/A Item | Justification |
|----------|--------------|
| Clean Architecture layers | Applies to NestJS backend modules only. Next.js uses file-based routing; route files are equivalent to thin controllers by convention. |
| Multi-tenancy DB checks | No DB tables or queries in this feature. |
| Clerk JWKS verification | Frontend does not verify JWTs. The backend (already complete) handles all verification. Epic 2 adds Clerk to both the frontend (ClerkProvider) and backend (replacing the stub guard). |
| BullMQ / async jobs | No async operations in a frontend scaffold feature. |
| E2E tests | Browser-level manual verification is appropriate for a scaffold. Automated E2E (Playwright or Cypress) is a separate feature. |
