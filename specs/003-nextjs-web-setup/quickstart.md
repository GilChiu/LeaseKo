# Quickstart: Next.js Web App Setup

**Feature**: `003-nextjs-web-setup`
**Branch**: `003-nextjs-web-setup`
**Last Updated**: 2026-05-02

---

## Prerequisites

Feature 001 (Monorepo Initialization) must be complete. The `apps/web` directory must already exist.

---

## Setup

### 1. Copy environment variables

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

> `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` can be empty until Epic 2 (Clerk integration).

### 2. Install dependencies

```bash
# From repo root
pnpm install
```

This installs the new Tailwind CSS devDependencies added to `apps/web/package.json`.

---

## Running the App

```bash
# Start web app only
pnpm --filter @leaseKo/web dev

# Start all apps (web + api)
pnpm dev
```

Open http://localhost:3000 — you should see the styled LeaseKo landing page.

| URL | What |
|-----|------|
| http://localhost:3000 | Landing page |
| http://localhost:3000/dashboard | Dashboard placeholder |

---

## Verifying Tailwind CSS Works

Open http://localhost:3000. The page should be styled — not raw unstyled HTML. If you see plain HTML with no styles:

1. Confirm `apps/web/src/styles/globals.css` contains the three `@tailwind` directives.
2. Confirm `apps/web/src/app/layout.tsx` imports `'../styles/globals.css'`.
3. Confirm `apps/web/tailwind.config.ts` has `content: ['./src/**/*.{ts,tsx}']`.
4. Restart the dev server.

---

## Verifying the API Client

The API client reads `NEXT_PUBLIC_API_URL` from your `.env.local`. To verify it is wired correctly:

```bash
# Start the NestJS API (Feature 002)
pnpm --filter @leaseKo/api dev

# In a separate terminal, start the web app
pnpm --filter @leaseKo/web dev
```

Open http://localhost:3000. The health status should appear on the landing page (if wired up in the page component). The API call goes to `${NEXT_PUBLIC_API_URL}/api/v1/health`.

---

## Building for Production

```bash
pnpm --filter @leaseKo/web build
```

Confirm: exit code 0, zero TypeScript errors. Tailwind CSS purges unused classes automatically when `NODE_ENV=production`.

```bash
# Full monorepo build (via Turborepo)
pnpm build
```

---

## Linting

```bash
pnpm --filter @leaseKo/web lint
```

Confirm: zero errors, zero warnings.

---

## File Overview

| File | Purpose |
|------|---------|
| `apps/web/tailwind.config.ts` | Tailwind CSS configuration — content paths, theme extension |
| `apps/web/postcss.config.mjs` | PostCSS pipeline — required for Tailwind to process CSS |
| `apps/web/src/styles/globals.css` | Global CSS — Tailwind directives + base styles |
| `apps/web/src/app/layout.tsx` | Root layout — imports globals.css, sets metadata |
| `apps/web/src/app/page.tsx` | Landing page — styled with Tailwind |
| `apps/web/src/app/(auth)/layout.tsx` | Auth route group layout — placeholder for ClerkProvider |
| `apps/web/src/app/(dashboard)/layout.tsx` | Dashboard layout — sidebar/header shell |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | Dashboard placeholder page |
| `apps/web/src/lib/api.ts` | Centralized fetch wrapper — use this for all API calls |
| `apps/web/src/lib/env.ts` | Env var validation — all env vars read from here |
| `apps/web/src/lib/utils.ts` | Shared utilities — `cn()` class name helper |
| `apps/web/src/components/ui/button.tsx` | Reusable Button component |
| `apps/web/src/components/ui/card.tsx` | Reusable Card component |
| `apps/web/src/components/ui/input.tsx` | Reusable Input component |
| `apps/web/.env.example` | Environment variable template |

---

## Adding a New API Call

```typescript
// In a feature file, e.g., src/features/properties/api.ts
import { apiFetch } from '@/lib/api';

export async function getProperties(token: string) {
  return apiFetch<Property[]>('/properties', { token });
}
```

Never use `fetch()` directly in feature code. Always go through `apiFetch`.

---

## Adding a New Environment Variable

1. Add to `apps/web/.env.example` with a placeholder value and comment
2. Add to `apps/web/.env.local` with the real value
3. Add validation to `apps/web/src/lib/env.ts`
4. Export the constant from `env.ts`
5. Import the constant wherever needed — never `process.env` directly

---

## Next Steps (Epic 2: Clerk Authentication)

1. Install `@clerk/nextjs` in `apps/web`
2. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to `.env.local` (real key from Clerk dashboard)
3. Wrap `apps/web/src/app/(auth)/layout.tsx` with `<ClerkProvider>`
4. Add `auth()` call to `apps/web/src/app/(dashboard)/layout.tsx` — redirect to sign-in if not authenticated
5. Create `middleware.ts` at `apps/web/src/middleware.ts` using `clerkMiddleware()`
6. Replace `StubBearerGuard` in `apps/api` with real Clerk JWT verification
