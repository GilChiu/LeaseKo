# Implementation Plan: Create Property Form

**Branch**: `sprint/002` | **Date**: 2026-06-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/038-create-property-form/spec.md`

## Summary

Add a `/properties/new` page to the Next.js dashboard with a form that lets landlords create properties through the UI. The backend `POST /api/v1/properties` endpoint is already implemented. This feature is frontend-only: a client-side–validated form that maps structured server errors (field-level and general) to inline messages and banners, using the existing `useState`-based pattern and Tailwind UI components.

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 14 (App Router)  
**Primary Dependencies**: @clerk/nextjs 5.7.x, React 18, Tailwind CSS 3.4  
**Storage**: N/A — backend already implemented; no new migrations required  
**Testing**: Jest (unit tests for validation logic)  
**Target Platform**: Web browser, desktop-first  
**Project Type**: Web application (frontend-only feature)  
**Performance Goals**: N/A — single form submission; UX target: immediate visual feedback on submit  
**Constraints**: No react-hook-form or zod installed; form state managed with `useState`; Tailwind-only UI (no shadcn); existing `Input` and `Button` components  
**Scale/Scope**: One new page, one new form component, one new API utility function

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Architecture**

- [x] No business logic in Next.js frontend — form component handles UX only; all authoritative validation enforced by backend
- [x] Domain layer imports no NestJS or Prisma packages — N/A (frontend feature)
- [x] Controllers are thin — N/A (no new backend controllers)
- [x] Cross-module interaction uses explicit interfaces or events only — N/A (no new backend modules)

**Multi-Tenancy (CRITICAL)**

- [x] All new DB tables include `tenant_id` column — N/A (no new tables)
- [x] All repository queries filter by `tenant_id` — N/A (no new queries)
- [x] `tenantId` comes from verified JWT only — the form never sends `tenantId` in the request body; the backend extracts it from the Clerk JWT via `@CurrentTenant()`

**Authentication & Authorization**

- [x] Clerk JWT verified via `useAuth().getToken()` and sent as `Authorization: Bearer <token>`
- [x] 401 response triggers redirect to `/sign-in` (session expiry)
- [x] 403 response (no active org) shows an inline workspace error — no redirect

**Data Layer**

- [x] N/A — no Prisma usage in frontend

**API & Async**

- [x] Endpoint already documented with Swagger/OpenAPI decorators — no new endpoints
- [x] Form submission is synchronous from frontend perspective — no queue work needed

**Testing**

- [x] Unit tests cover client-side validation logic (required fields, max-length rules, blank optional field omission)
- [ ] E2E tests deferred — Playwright not yet installed in this project

**Security**

- [x] No secrets or credentials in source code
- [x] All authoritative validation enforced by the backend; client-side validation is UX-only

## Project Structure

### Documentation (this feature)

```text
specs/038-create-property-form/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── api-contract.md  ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code Changes

```text
apps/web/src/
├── app/
│   └── (dashboard)/
│       └── properties/
│           ├── page.tsx                          ← MODIFY: add "Add property" button to success-state header
│           └── new/
│               └── page.tsx                     ← NEW: thin server-compatible page wrapper
└── lib/
    └── properties-api.ts                        ← NEW: createProperty() with structured error handling

apps/web/src/app/(dashboard)/properties/_components/
└── create-property-form.tsx                     ← NEW: "use client" form component
```

**Structure Decision**: Frontend-only changes within the existing `(dashboard)` route group. The form component is colocated under `_components/` consistent with `property-card.tsx`. A dedicated `properties-api.ts` separates API interaction from the component, making the validation logic independently testable.

## Complexity Tracking

> No Constitution Check violations. All checks pass or are N/A for this frontend-only feature.
