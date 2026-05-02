# Data Model: Clerk Authentication — Next.js Frontend

**Feature**: 007-clerk-auth-nextjs
**Date**: 2026-05-02

---

## Overview

This feature introduces no new database tables or domain entities. The "data model" describes the **authentication state entities** and **configuration artifacts** that Clerk manages.

---

## Authentication State Entities

### ClerkSession

Managed entirely by Clerk — not stored by the application.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `userId` | string | Clerk JWT `sub` claim | Stable Clerk user identifier (`user_xxxx`) |
| `sessionId` | string | Clerk session | Rotated on sign-out |
| `orgId` | string \| null | Clerk JWT `org_id` | `null` until Clerk Organizations enabled (Feature 009+) |

**Rules**:
- Never stored in `localStorage` or application state
- Accessed server-side via `auth()` from `@clerk/nextjs/server`
- Accessed client-side via `useAuth()` / `useUser()` hooks from `@clerk/nextjs`
- The frontend never validates the session — that is the backend's responsibility

### ClerkJWT

The token the frontend passes to the NestJS backend for API calls.

| Field | Type | Notes |
|-------|------|-------|
| `token` | string | Short-lived JWT retrieved via `getToken()` |
| `Authorization` header | `Bearer <token>` | Attached by `apiFetch()` in `apps/web/src/lib/api.ts` |

**Rules**:
- Retrieved fresh per request via `getToken()` — never cached manually
- Never decoded or validated by the frontend
- Backend (`apps/api`) verifies the JWT against Clerk JWKS (Feature 008)

---

## Environment Configuration

### `apps/web/.env.local` (gitignored — copied from `.env.example`)

| Variable | Exposure | Required | Source |
|----------|----------|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Browser | Yes | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Server only | Yes | Clerk dashboard → API Keys |
| `NEXT_PUBLIC_API_URL` | Browser | Yes | `http://localhost:3001` (local) |

**Security rules**:
- `NEXT_PUBLIC_` variables are embedded in the JavaScript bundle — safe for public keys only
- `CLERK_SECRET_KEY` must never be assigned to a `NEXT_PUBLIC_` variable
- Real values must never be committed — only the `.env.example` placeholder file is committed

---

## Route Model

### Public Routes (no authentication required)

| Route | File | Notes |
|-------|------|-------|
| `/` | `app/page.tsx` | Home page — shows auth CTAs based on sign-in state |
| `/sign-in` + sub-routes | `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Clerk-hosted sign-in |
| `/sign-up` + sub-routes | `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Clerk-hosted sign-up |

### Protected Routes (authentication required)

| Route | File | Redirect if unauthenticated |
|-------|------|---------------------------|
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | → `/sign-in` |
| `/dashboard/*` (future) | Under `app/(dashboard)/` | → `/sign-in` |

### Middleware Matcher

The middleware runs on all routes except Next.js internals and static assets:

```
matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)','/(api|trpc)(.*)']
```

---

## File Artifacts

| File | Status | Change |
|------|--------|--------|
| `apps/web/package.json` | Exists — update | Add `@clerk/nextjs` dependency |
| `apps/web/.env.example` | Exists — update | Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |
| `apps/web/src/app/layout.tsx` | Exists — update | Wrap with `ClerkProvider` |
| `apps/web/src/middleware.ts` | Does not exist — create | `clerkMiddleware()` with public route matcher |
| `apps/web/src/app/(auth)/layout.tsx` | Exists — update | Remove incorrect ClerkProvider comment; keep centering layout |
| `apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Does not exist — create | Clerk `SignIn` component |
| `apps/web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Does not exist — create | Clerk `SignUp` component |
| `apps/web/src/app/(dashboard)/layout.tsx` | Exists — update | Replace `UserButton` stub with real component |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | Exists — no change | Already correct placeholder |
| `apps/web/src/app/page.tsx` | Exists — update | Add `SignedIn`/`SignedOut` conditional navigation |
| `apps/web/src/lib/api.ts` | Exists — no change | Already supports `token` parameter |
| `README.md` | Exists — update | Add Clerk setup section |
