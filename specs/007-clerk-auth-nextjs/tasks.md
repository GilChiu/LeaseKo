# Tasks: Clerk Authentication — Next.js Frontend

**Input**: Design documents from `specs/007-clerk-auth-nextjs/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label — US1/US2/US3/US4
- Exact file paths are in every task description

---

## Phase 1: Setup

**Purpose**: Install the Clerk package so components and server utilities are available.

- [X] T001 Run `pnpm --filter @leaseKo/web add @clerk/nextjs` and confirm `@clerk/nextjs` appears in `apps/web/package.json` `dependencies`

**Checkpoint**: `@clerk/nextjs` installed — foundational phase can begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Environment variables and `ClerkProvider` must be in place before any user story can be implemented.

**⚠️ CRITICAL**: All user story phases depend on T003 completing first.

- [X] T002 [P] Update `apps/web/.env.example` — add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=` (browser-safe) and `CLERK_SECRET_KEY=` (server-only, with comment warning) alongside existing `NEXT_PUBLIC_API_URL`
- [X] T003 Update `apps/web/src/app/layout.tsx` — import `ClerkProvider` from `@clerk/nextjs` and wrap the root `<html>` element so Clerk session context is available across all routes

**Checkpoint**: Foundation ready — all user story phases can now begin in parallel

---

## Phase 3: User Story 1 — Sign Up and Sign In (Priority: P1) 🎯 MVP

**Goal**: Users can register and sign in via Clerk-hosted UI, and land on `/dashboard` after completing either flow. The home page shows contextual CTAs based on auth state.

**Independent Test**: Navigate to `/sign-up`, complete Clerk's sign-up form, confirm redirect to `/dashboard`. Sign out, navigate to `/sign-in`, complete sign-in, confirm redirect to `/dashboard`. On the home page (signed out), confirm Sign In and Sign Up links are visible; signed in, confirm a "Go to Dashboard" link is visible instead.

- [X] T004 [P] [US1] Create `apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` — render `<SignIn afterSignInUrl="/dashboard" />` from `@clerk/nextjs`
- [X] T005 [P] [US1] Create `apps/web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` — render `<SignUp afterSignUpUrl="/dashboard" />` from `@clerk/nextjs`
- [X] T006 [P] [US1] Update `apps/web/src/app/page.tsx` — replace the hardcoded `/dashboard` link with `<SignedOut>` showing `<SignInButton>` + `<SignUpButton>` and `<SignedIn>` showing a "Go to Dashboard" `<Link href="/dashboard">` using `@clerk/nextjs` components
- [X] T007 [US1] Update `apps/web/src/app/(auth)/layout.tsx` — remove the incorrect comment suggesting `ClerkProvider` goes in this layout (it lives in the root layout); preserve the existing centering flex styles

**Checkpoint**: User Story 1 complete — `/sign-in`, `/sign-up`, and home-page auth navigation all functional

---

## Phase 4: User Story 2 — Protected Dashboard Access (Priority: P1)

**Goal**: Unauthenticated visitors who navigate to `/dashboard` (or any sub-route) are redirected to `/sign-in` automatically. Authenticated users reach the dashboard without interruption.

**Independent Test**: Open an incognito window, navigate directly to `http://localhost:3000/dashboard`, confirm automatic redirect to `/sign-in`. Sign in, confirm `/dashboard` renders. Navigate to `/` (home), confirm no auth is required.

- [X] T008 [US2] Create `apps/web/src/middleware.ts` — import `clerkMiddleware` and `createRouteMatcher` from `@clerk/nextjs/server`; define `isPublicRoute` matching `['/', '/sign-in(.*)', '/sign-up(.*)']`; call `await auth.protect()` for all non-public routes; export the standard Next.js `config.matcher` that covers all routes except `_next` internals and static assets

**Checkpoint**: User Story 2 complete — protected routes redirect unauthenticated users

---

## Phase 5: User Story 3 — Sign Out (Priority: P1)

**Goal**: A signed-in user can terminate their Clerk session from the dashboard header and be redirected back to `/sign-in`.

**Independent Test**: Sign in, access `/dashboard`, click the `UserButton` in the header, choose "Sign out", confirm redirect to `/sign-in`. Navigate directly to `/dashboard` — confirm redirect occurs again.

- [X] T009 [US3] Update `apps/web/src/app/(dashboard)/layout.tsx` — import `UserButton` from `@clerk/nextjs`; replace the `{/* Epic 2: <UserButton /> from @clerk/nextjs goes here */}` stub (and the `<span>Account</span>` placeholder if present) with `<UserButton afterSignOutUrl="/sign-in" />`

**Checkpoint**: User Story 3 complete — `UserButton` enables session sign-out from the dashboard

---

## Phase 6: User Story 4 — Authenticated API Client Readiness (Priority: P2)

**Goal**: Confirm the existing API client already satisfies FR-010 — no code changes needed, verification only.

**Independent Test**: Read `apps/web/src/lib/api.ts` and confirm `apiFetch` accepts an optional `token?: string` parameter and, when provided, sets `Authorization: Bearer <token>` in the request headers.

- [X] T010 [P] [US4] Read `apps/web/src/lib/api.ts` — verify `token?: string` parameter exists and `Authorization: Bearer <token>` header is set when token is provided; no code changes required (FR-010 pre-satisfied)

**Checkpoint**: User Story 4 satisfied — API client is ready for future authenticated calls

---

## Phase 7: Polish & Verification

**Purpose**: Confirm all tooling passes and document the Clerk setup for developers.

- [X] T011 [P] Run `pnpm --filter @leaseKo/web typecheck` — must exit 0 with zero TypeScript errors across all modified and created files
- [X] T012 [P] Run `pnpm --filter @leaseKo/web lint` — must exit 0 with zero ESLint errors
- [X] T013 Run `pnpm --filter @leaseKo/web build` — must produce a successful production build with no errors (depends on T011 + T012)
- [X] T014 Update `README.md` — add a **Clerk Authentication** section documenting: how to get Clerk API keys, how to copy `.env.example` to `.env.local`, and the `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` env variable reference

**Checkpoint**: All verification gates pass — feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

```
T001 (install)
  └─► T002 [P] (.env.example update)
  └─► T003 (ClerkProvider in root layout)
        └─► T004 [P] [US1] sign-in page
        └─► T005 [P] [US1] sign-up page
        └─► T006 [P] [US1] home page nav
        └─► T007 [US1] auth layout cleanup
        └─► T008 [US2] middleware
        └─► T009 [US3] UserButton
T010 [P] [US4] api.ts verify — no dependencies (read-only)

All implementation done
  └─► T011 [P] typecheck
  └─► T012 [P] lint
        └─► T013 build
        └─► T014 README
```

### User Story Dependencies

- **US1 (P1)**: Depends on T003 (ClerkProvider) — T004, T005, T006, T007 can run in parallel
- **US2 (P1)**: Depends on T003 (ClerkProvider) — T008 can run in parallel with US1
- **US3 (P1)**: Depends on T003 (ClerkProvider) — T009 can run in parallel with US1 + US2
- **US4 (P2)**: No dependencies — T010 can run at any point (read-only verification)
- **US1, US2, US3** are all Priority P1 — implement US1 first as it is the most user-visible

### Parallel Opportunities

```bash
# After T001, run in parallel:
T002 (.env.example)    # different file, no code deps
T003 (root layout)     # foundational — run this first before US phases

# After T003, run all US phases in parallel:
T004 (sign-in page)    # new file
T005 (sign-up page)    # new file
T006 (home page)       # existing file, different from T004/T005
T007 (auth layout)     # existing file, different from above
T008 (middleware)      # new file
T009 (UserButton)      # existing file, different from all above

# At any time:
T010 (api.ts verify)   # read-only

# After all implementation, run in parallel:
T011 (typecheck)
T012 (lint)
T014 (README)
# Then:
T013 (build)           # after T011 + T012
```

---

## Implementation Strategy

### MVP: User Stories 1, 2, and 3 (all P1)

All three P1 stories must be complete for a working auth flow:

1. Complete Phase 1: Install `@clerk/nextjs`
2. Complete Phase 2: ClerkProvider + env vars
3. Complete Phases 3–5: US1 (sign-in/sign-up) + US2 (middleware) + US3 (UserButton) in parallel
4. **STOP and VALIDATE**: Test the full sign-up → dashboard → sign-out → sign-in loop
5. Complete Phase 6: Verify US4 api.ts (quick read-only check)
6. Complete Phase 7: Verification gates + README

### Task Count Summary

| Phase | Tasks | User Story |
|-------|-------|-----------|
| 1: Setup | T001 | — |
| 2: Foundational | T002–T003 | — |
| 3: Sign Up / Sign In | T004–T007 | US1 (P1) |
| 4: Route Protection | T008 | US2 (P1) |
| 5: Sign Out | T009 | US3 (P1) |
| 6: API Client | T010 | US4 (P2) |
| 7: Polish | T011–T014 | — |
| **Total** | **14** | |

### Parallel Opportunities: 4 identified

1. T002 + T003 (after T001)
2. T004 + T005 + T006 + T007 + T008 + T009 (after T003)
3. T011 + T012 + T014 (after all implementation)
4. T010 (any time — read-only)
