# Implementation Plan: Property Detail & Unit Management

**Branch**: `sprint/002` | **Date**: 2026-06-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/039-property-detail-units/spec.md`

## Summary

Add a `/properties/[id]` detail page to the Next.js dashboard that shows a property's full details and its unit list, and provides an inline form to create new units. The `PropertyCard` component already navigates to `/properties/:id` on click. All three backend endpoints (`GET /properties/:id`, `GET /properties/:propertyId/units`, `POST /properties/:propertyId/units`) are already implemented. This feature is frontend-only.

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 14 (App Router)
**Primary Dependencies**: @clerk/nextjs 5.7.x, React 18, Tailwind CSS 3.4
**Storage**: N/A — all backend endpoints already implemented; no new migrations
**Testing**: Jest (unit tests for validation logic)
**Target Platform**: Web browser, desktop-first
**Project Type**: Web application (frontend-only feature)
**Performance Goals**: Property detail + unit list load in under 5 seconds on standard connection
**Constraints**: No react-hook-form, no modal library, no zod; custom `useState`-based forms; existing `Input` and `Button` components; structured `{ success, error }` API error envelope
**Scale/Scope**: One new route group, three new components, one new API utility file, one type addition

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Architecture**

- [x] No business logic in Next.js frontend — all data fetching, validation, and persistence delegated to backend
- [x] Domain layer imports no NestJS or Prisma packages — N/A (frontend feature)
- [x] Controllers are thin — N/A (no new backend controllers)
- [x] Cross-module interaction uses explicit interfaces — N/A (no new backend modules)

**Multi-Tenancy (CRITICAL)**

- [x] All new DB tables include `tenant_id` — N/A (no new tables)
- [x] All repository queries filter by `tenant_id` — N/A (no new queries)
- [x] `tenantId` comes from verified JWT only — `propertyId` comes from URL path; `tenantId` resolved by backend from Clerk JWT; never in request body

**Authentication & Authorization**

- [x] Clerk JWT passed as `Authorization: Bearer <token>` on all API calls
- [x] 401 → redirect to `/sign-in`; 403 → inline workspace error (no redirect); 404 → not-found state

**Data Layer**

- [x] N/A — no Prisma usage in frontend

**API & Async**

- [x] All backend endpoints already documented with Swagger/OpenAPI — no new endpoints
- [x] No queue work needed — synchronous form submission

**Testing**

- [x] Unit tests for add-unit form client-side validation (required unit number, max-length)
- [ ] E2E tests deferred — Playwright not installed

**Security**

- [x] No secrets in source code
- [x] `propertyId` taken from URL path only — never trusted from the client body
- [x] Numeric field validation (positive-only, integer-only for bedrooms) enforced by backend; frontend shows server errors

## Project Structure

### Documentation (this feature)

```text
specs/039-property-detail-units/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── api-contract.md  ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code Changes

```text
apps/web/src/
├── lib/
│   ├── types.ts                                    ← MODIFY: add Unit, PagedUnits types
│   └── units-api.ts                                ← NEW: getPropertyById, getUnits, createUnit
└── app/
    └── (dashboard)/
        └── properties/
            └── [id]/
                ├── page.tsx                        ← NEW: thin server component wrapper
                └── _components/
                    ├── property-detail-view.tsx    ← NEW: "use client" page orchestrator
                    ├── unit-list.tsx               ← NEW: unit cards display
                    └── add-unit-form.tsx           ← NEW: inline unit creation form
```

**No changes needed to**:
- `property-card.tsx` — already navigates to `/properties/:id` on click
- All backend modules — all three endpoints already implemented

**Structure Decision**: The dynamic route `[id]` is a thin server component; all client-side logic (auth, fetching, form state) lives in `property-detail-view.tsx` as a `"use client"` component. The unit creation form is inline on the detail page — consistent with existing patterns and avoids introducing a modal library.

## Complexity Tracking

> No Constitution Check violations. All checks pass or are N/A for this frontend-only feature.
