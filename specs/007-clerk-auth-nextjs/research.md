# Research: Clerk Authentication — Next.js Frontend

**Feature**: 007-clerk-auth-nextjs
**Date**: 2026-05-02
**Phase**: 0 — Pre-Design Research

---

## D1 — @clerk/nextjs Package Version

**Decision**: Install `@clerk/nextjs@^5` (latest stable).

**Rationale**: `@clerk/nextjs` v5 is the current stable release and the version explicitly designed for Next.js 14 App Router. It introduces `clerkMiddleware()` as the replacement for the deprecated `authMiddleware()`, and correctly handles Server Components via `auth()` from `@clerk/nextjs/server`.

**Alternatives considered**:
- `@clerk/nextjs@^4`: Deprecated, uses `authMiddleware` which is removed in v5. Would require migration immediately. Rejected.
- Pinning to a specific patch: Unnecessary — `^5` tracks stable patch releases only.

---

## D2 — Middleware API: `clerkMiddleware` vs `authMiddleware`

**Decision**: Use `clerkMiddleware()` + `createRouteMatcher()` from `@clerk/nextjs/server`.

**Rationale**: `authMiddleware` was deprecated in `@clerk/nextjs` v4 and removed in v5. `clerkMiddleware()` is the v5 API. `createRouteMatcher` provides a clean declarative public-routes pattern. Example:

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});
```

`auth.protect()` automatically redirects unauthenticated users to the sign-in URL configured in Clerk.

**Alternatives considered**:
- `authMiddleware` with `publicRoutes`: Deprecated. Rejected.
- Manual `auth()` check in every layout: Verbose and fragile — misses routes. Middleware is the canonical approach. Rejected.

---

## D3 — ClerkProvider Placement

**Decision**: Place `ClerkProvider` in the root layout at `apps/web/src/app/layout.tsx`, wrapping all children.

**Rationale**: Clerk's session context must be available in both public routes (for `SignedIn`/`SignedOut` navigation state) and protected routes (for `UserButton`, `auth()`, etc.). Placing it only in `(auth)/layout.tsx` would break session state for dashboard routes. The existing `(auth)/layout.tsx` comment suggesting ClerkProvider placement there is incorrect — remove it.

**Alternatives considered**:
- ClerkProvider in `(auth)/layout.tsx`: Would not provide session context to `(dashboard)/` routes. Rejected.
- ClerkProvider in multiple layouts: Causes nested provider errors. Rejected.

---

## D4 — `apps/web/src/lib/api.ts` Token Support

**Decision**: No changes needed. FR-010 is already satisfied.

**Rationale**: `apiFetch` already accepts `options: RequestInit & { token?: string }` and attaches `Authorization: Bearer <token>` when provided. This is the exact pattern needed for future Clerk JWT injection.

**Future usage** (not implemented in this feature):
```ts
import { useAuth } from '@clerk/nextjs';
const { getToken } = useAuth();
const token = await getToken();
const data = await apiFetch('/properties', { token });
```

---

## D5 — CLERK_SECRET_KEY in Web App

**Decision**: Include `CLERK_SECRET_KEY` in `apps/web/.env.example` as a clearly documented placeholder.

**Rationale**: Next.js App Router supports Server Components and Route Handlers that run exclusively on the server. `auth()` from `@clerk/nextjs/server` uses `CLERK_SECRET_KEY` for server-side session operations. It must be present in `apps/web/.env.local` for the app to work.

**Security constraint**: `CLERK_SECRET_KEY` must never be assigned to a `NEXT_PUBLIC_` variable. The key is only accessible in server-side code. This must be documented clearly.

**Note**: The NestJS backend (`apps/api`) also needs `CLERK_SECRET_KEY` for JWT JWKS verification — that is Feature 008's concern. The two apps share the same Clerk application and the same keys.

---

## D6 — Catch-All Route Pattern `[[...sign-in]]`

**Decision**: Use `[[...sign-in]]` (optional catch-all) for both sign-in and sign-up pages.

**Rationale**: Clerk's hosted UI handles multiple sub-steps: `/sign-in`, `/sign-in/sso-callback`, `/sign-in/factor-one`, `/sign-in/factor-two`. Without catch-all routing, these sub-routes return 404 in Next.js. The optional catch-all `[[...param]]` (double brackets) handles both the base path and all sub-paths.

**Alternatives considered**:
- Required catch-all `[...sign-in]`: Does not match the bare `/sign-in` path. Rejected.
- Single static `page.tsx`: Breaks Clerk's multi-step auth flow. Rejected.

---

## D7 — UserButton Placement

**Decision**: Replace the `{/* Epic 2: <UserButton /> */}` stub in `(dashboard)/layout.tsx` header with `<UserButton />` from `@clerk/nextjs`.

**Rationale**: The dashboard layout already has the correct location — the top-bar header's `ml-auto` div. `UserButton` provides sign-out, profile management, and (future) organization switching in a single composable component.

---

## D8 — Home Page Navigation State

**Decision**: Update `apps/web/src/app/page.tsx` to use `SignedIn`/`SignedOut` components for conditional navigation.

**Rationale**: The current home page links directly to `/dashboard`. After Clerk integration, signed-out users should see Sign In / Sign Up CTAs, and signed-in users should see the Dashboard link. Using `SignedIn`/`SignedOut` from `@clerk/nextjs` handles this without custom auth logic.

**Note**: These are client-rendering Clerk components. The `page.tsx` must be kept as a Server Component (no `"use client"`) — `SignedIn`/`SignedOut` work correctly in Server Components in `@clerk/nextjs` v5.

---

## Summary

| Decision | Outcome |
|----------|---------|
| D1 Package version | `@clerk/nextjs@^5` |
| D2 Middleware API | `clerkMiddleware()` + `createRouteMatcher()` |
| D3 ClerkProvider placement | Root `layout.tsx` only |
| D4 `api.ts` token support | Already satisfies FR-010 — no changes needed |
| D5 `CLERK_SECRET_KEY` in web | Include in `.env.example`, server-side only |
| D6 Catch-all routes | `[[...sign-in]]` and `[[...sign-up]]` |
| D7 UserButton | Replace stub in `(dashboard)/layout.tsx` header |
| D8 Home page nav | `SignedIn`/`SignedOut` conditional CTAs |
