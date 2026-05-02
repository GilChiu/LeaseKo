# Quick Start: Clerk Authentication — Next.js

**Feature**: 007-clerk-auth-nextjs
**Date**: 2026-05-02

---

## Prerequisites

- A Clerk account at https://clerk.com
- A Clerk application created in the Clerk dashboard
- Clerk API keys available from the dashboard → **API Keys** section

---

## 1. Get Your Clerk Keys

1. Go to https://dashboard.clerk.com
2. Select your application (or create one)
3. Navigate to **Configure → API Keys**
4. Copy:
   - **Publishable key** (`pk_test_...` or `pk_live_...`) → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** (`sk_test_...` or `sk_live_...`) → `CLERK_SECRET_KEY`

---

## 2. Configure Environment Variables

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_here
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 3. Start the Frontend

```bash
pnpm --filter @leaseKo/web dev
# or from monorepo root:
pnpm dev
```

Navigate to http://localhost:3000.

---

## 4. Test Authentication

**Sign Up**:
1. Click **Sign Up** on the home page or navigate to http://localhost:3000/sign-up
2. Complete the Clerk sign-up form
3. Confirm redirect to http://localhost:3000/dashboard

**Sign In**:
1. Sign out (via UserButton in the dashboard header)
2. Navigate to http://localhost:3000/sign-in
3. Complete sign-in
4. Confirm redirect to http://localhost:3000/dashboard

**Route Protection**:
1. Open an incognito window
2. Navigate directly to http://localhost:3000/dashboard
3. Confirm redirect to http://localhost:3000/sign-in

---

## Route Reference

| Route | Access | Notes |
|-------|--------|-------|
| `/` | Public | Shows Sign In / Sign Up CTAs when signed out |
| `/sign-in` | Public | Clerk-hosted sign-in UI |
| `/sign-up` | Public | Clerk-hosted sign-up UI |
| `/dashboard` | Protected | Redirects to `/sign-in` if unauthenticated |
| `/dashboard/*` | Protected | All sub-routes protected by middleware |

---

## Verification Commands

```bash
# Type-check — must pass
pnpm typecheck

# Lint — must pass with zero errors
pnpm lint

# Build — must succeed
pnpm build
```

---

## Important Security Notes

- `CLERK_SECRET_KEY` is **server-side only** — never assign it to a `NEXT_PUBLIC_` variable
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is safe to expose in the browser bundle
- Frontend route protection is **UX-level only** — the NestJS backend (Feature 008) verifies all JWTs independently
- Never store session tokens manually in `localStorage`

---

## What This Enables

| Future Feature | Dependency |
|---------------|-----------|
| Feature 008 — NestJS JWT Verification | `CLERK_SECRET_KEY` + `CLERK_JWKS_URL` in `apps/api/.env` to verify tokens from Clerk |
| Feature 009 — Clerk Organizations | Enable Organizations in the Clerk dashboard; `orgId` available via `auth().orgId` for tenant mapping |
| Future API calls | `const token = await getToken(); apiFetch('/properties', { token })` |
