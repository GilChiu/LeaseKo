# Feature Specification: Clerk Authentication — Next.js Frontend

**Feature Branch**: `007-clerk-auth-nextjs`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Integrate Clerk authentication into the Next.js frontend so users can securely sign up, sign in, and access protected frontend routes."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Sign Up and Sign In (Priority: P1)

As a new user, I want to create an account and as a returning user I want to sign in, so I can access the property management dashboard.

**Why this priority**: Without authentication, no user can reach any protected feature. This is the foundational user-facing capability of the entire SaaS.

**Independent Test**: Navigate to `/sign-up`, complete Clerk's sign-up flow, and land on `/dashboard`. Navigate to `/sign-out` or use the sign-out control, then navigate to `/sign-in`, complete the sign-in flow, and land on `/dashboard` again.

**Acceptance Scenarios**:

1. **Given** a visitor with no account, **When** they navigate to `/sign-up` and complete the Clerk sign-up form, **Then** they are redirected to `/dashboard` after successful registration.
2. **Given** a registered user, **When** they navigate to `/sign-in` and complete the Clerk sign-in form, **Then** they are redirected to `/dashboard` after successful authentication.
3. **Given** an invalid sign-in attempt (wrong password), **When** the user submits the form, **Then** Clerk displays a descriptive error message without a page crash.

---

### User Story 2 — Protected Dashboard Access (Priority: P1)

As an unauthenticated visitor, I must be redirected away from protected routes so that only authenticated users can view the dashboard.

**Why this priority**: Route protection is a security-level UX requirement. Without it, unauthenticated visitors can reach the dashboard shell even though the backend would reject their API calls.

**Independent Test**: Open an incognito window, navigate directly to `/dashboard`, and confirm an automatic redirect to `/sign-in`. Then sign in and confirm `/dashboard` is accessible.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they navigate to `/dashboard` (or any `/dashboard/*` sub-route), **Then** they are automatically redirected to `/sign-in`.
2. **Given** an authenticated user, **When** they navigate to `/dashboard`, **Then** the dashboard renders without redirect.
3. **Given** an authenticated user, **When** they navigate to `/` (the public home page), **Then** the page renders without authentication being required.

---

### User Story 3 — Sign Out (Priority: P1)

As an authenticated user, I want to sign out so my session is terminated and I return to the public site.

**Why this priority**: Sign-out is a required part of any authentication flow. Without it, users cannot cleanly end their session.

**Independent Test**: Sign in, access `/dashboard`, click the sign-out control, and confirm redirection to `/sign-in` or `/`.

**Acceptance Scenarios**:

1. **Given** a signed-in user on `/dashboard`, **When** they click the sign-out control, **Then** their Clerk session is terminated and they are redirected to `/sign-in` or `/`.
2. **Given** a user who has signed out, **When** they navigate to `/dashboard`, **Then** they are redirected to `/sign-in` again.

---

### User Story 4 — Authenticated API Client Readiness (Priority: P2)

As a frontend developer, I want the API client to support attaching a Clerk JWT as a Bearer token, so that future API calls to the NestJS backend are authenticated.

**Why this priority**: The API client pattern must be established now so future features can attach tokens without refactoring. The actual token retrieval from Clerk must be wired in but not yet used against a real protected endpoint.

**Independent Test**: Review `apps/web/src/lib/api.ts` — confirm it accepts an optional `token` parameter and attaches it as `Authorization: Bearer <token>` when provided. No real API call is required to verify this.

**Acceptance Scenarios**:

1. **Given** the API client utility, **When** a `token` is provided to a fetch call, **Then** the request includes `Authorization: Bearer <token>` in the headers.
2. **Given** no token is provided, **When** a fetch call is made, **Then** no `Authorization` header is included.

---

### Edge Cases

- What happens when a Clerk sign-in session expires while the user is on the dashboard? Clerk middleware detects the expired session and redirects the user to `/sign-in`.
- What happens when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is not set? The app fails to initialise ClerkProvider and throws a clear startup error — not a silent auth bypass.
- What happens when a user visits `/sign-in` while already signed in? Clerk redirects them to `/dashboard` automatically (afterSignInUrl behaviour).
- What happens when a user navigates to a non-existent dashboard sub-route? Next.js returns the standard 404 page — the middleware still enforces authentication first.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The `@clerk/nextjs` package MUST be installed in `apps/web`.
- **FR-002**: The root layout (`apps/web/src/app/layout.tsx`) MUST wrap the application with `ClerkProvider`.
- **FR-003**: A sign-in page MUST exist at `apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` using the Clerk `SignIn` component. Successful sign-in MUST redirect to `/dashboard`.
- **FR-004**: A sign-up page MUST exist at `apps/web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` using the Clerk `SignUp` component. Successful sign-up MUST redirect to `/dashboard`.
- **FR-005**: A middleware file MUST exist at `apps/web/src/middleware.ts` that protects `/dashboard` and all its sub-routes using Clerk's middleware. Public routes (`/`, `/sign-in`, `/sign-up`) MUST remain accessible without authentication.
- **FR-006**: Unauthenticated requests to protected routes MUST be redirected to `/sign-in`.
- **FR-007**: The dashboard layout MUST include a sign-out control so authenticated users can terminate their session.
- **FR-008**: `apps/web/.env.example` MUST document `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_API_URL` with instructions for obtaining Clerk keys.
- **FR-009**: No real Clerk keys MUST appear in any committed file.
- **FR-010**: The frontend API client (`apps/web/src/lib/api.ts`) MUST support an optional `token` parameter that is attached as `Authorization: Bearer <token>` when provided.
- **FR-011**: Frontend route protection is UX-level only. The NestJS backend MUST remain the sole authority for verifying Clerk JWTs and enforcing access control.

### Key Entities

- **Clerk Session**: Managed entirely by Clerk — not stored manually in localStorage, cookies, or application state. Accessed server-side via `auth()` and client-side via Clerk hooks.
- **PublishableKey**: The `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` environment variable that identifies the Clerk application. Safe to expose in the browser.
- **SecretKey**: The `CLERK_SECRET_KEY` environment variable used for server-side Clerk operations. Must never be exposed to the browser or committed.
- **JWT Token**: Retrieved from Clerk via `getToken()` (client) or `auth().getToken()` (server). Passed as Bearer token to the NestJS API. The backend verifies it independently — the frontend never validates it.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A first-time visitor can complete sign-up and reach the dashboard in under 2 minutes following only in-product prompts.
- **SC-002**: Navigating directly to `/dashboard` in an incognito browser session always redirects to `/sign-in` — verified in 5 consecutive attempts.
- **SC-003**: An authenticated user can sign out and be redirected within 3 seconds of clicking the sign-out control.
- **SC-004**: The app builds without TypeScript errors (`pnpm typecheck`) and passes lint (`pnpm lint`) after all Clerk integration changes.
- **SC-005**: No Clerk keys, session tokens, or real credentials appear in any committed file across the repository.

## Assumptions

- Clerk project and application have already been created at https://dashboard.clerk.com — this feature only configures the Next.js SDK; it does not provision the Clerk app itself.
- The Clerk application is configured to use Email/Password and/or social OAuth — the exact sign-in methods are configured in the Clerk dashboard, not in this codebase.
- `CLERK_SECRET_KEY` is added to `apps/web/.env.example` as a placeholder only; the actual secret key is not used in any client-side code in this feature. Server-side usage (e.g., `auth()` in Server Components) will require it at runtime.
- Clerk Organizations (for multi-tenancy) are out of scope for this feature. The organization switcher placeholder in the dashboard layout is a UI stub only.
- The `apps/web/src/lib/api.ts` file already exists with `apiFetch` supporting an optional `token` parameter. If this already satisfies FR-010, verification is sufficient — no rewrite needed.
- The dashboard route group `(dashboard)/` and its layout already exist as placeholder scaffolding. This feature updates them to wire in Clerk auth state.
- Styling is consistent with the existing Tailwind CSS setup. Clerk components use their default appearance; custom theming is deferred.
