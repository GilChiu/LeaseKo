# Quick Start: Clerk JWT Verification — NestJS Backend

**Feature**: 008-clerk-jwt-nestjs
**Date**: 2026-05-02

---

## Prerequisites

- A Clerk application at https://dashboard.clerk.com
- A Clerk **Secret key** (`sk_test_...`) from the dashboard
- Docker Desktop running (PostgreSQL + Redis via `pnpm db:up`)
- The frontend (`apps/web`) configured with Clerk keys so you can obtain a real JWT for testing

---

## 1. Configure Backend Environment Variables

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and fill in:

```bash
CLERK_SECRET_KEY=sk_test_your_secret_key_here
# CLERK_JWKS_URL=  ← leave blank unless on a private network
```

The `CLERK_SECRET_KEY` is required. The app will fail fast at startup if it is missing.

---

## 2. Install Dependencies

```bash
pnpm install
```

Or if adding the package for the first time:

```bash
pnpm --filter @leaseKo/api add @clerk/backend
```

---

## 3. Start the Backend

```bash
pnpm --filter @leaseKo/api dev
# or from monorepo root:
pnpm dev
```

The API runs at `http://localhost:3001`.

---

## 4. Get a Valid Clerk JWT

The easiest way is from the frontend:

1. Start the frontend: `pnpm --filter @leaseKo/web dev`
2. Sign in at `http://localhost:3000/sign-in`
3. Open the browser console and run:

```javascript
// Clerk v5 — get a fresh session token
const token = await window.Clerk.session.getToken();
console.log(token);
```

Copy the printed JWT string.

Alternatively, from Postman or any HTTP client — sign in via Clerk's API and retrieve the session token.

---

## 5. Test Protected Endpoints

### Verify `GET /me` — valid token

```bash
curl -s http://localhost:3001/api/v1/me \
  -H "Authorization: Bearer <paste-your-jwt-here>" | jq .
```

Expected response:
```json
{ "userId": "user_2abc123..." }
```

### Verify `GET /me` — no token

```bash
curl -s http://localhost:3001/api/v1/me | jq .
```

Expected response:
```json
{ "statusCode": 401, "message": "Unauthorized", "error": "Unauthorized" }
```

### Verify `GET /health` — public (no token required)

```bash
curl -s http://localhost:3001/api/v1/health | jq .
```

Expected response:
```json
{ "status": "ok", "service": "api", "timestamp": "..." }
```

---

## 6. Test via Swagger UI

1. Open `http://localhost:3001/api/docs`
2. Click **Authorize** (lock icon, top right)
3. Paste your Clerk JWT into the Bearer field and click **Authorize**
4. Expand `GET /me` → click **Try it out** → **Execute**
5. Confirm `200` response with `{ "userId": "..." }`
6. Click **Authorize** again → **Logout** → retry `GET /me` → confirm `401`

---

## Route Reference

| Route | Auth | Expected |
|-------|------|----------|
| `GET /api/v1/health` | None | `200 { status: "ok" }` |
| `GET /api/v1/me` | Bearer token | `200 { userId: "..." }` |
| `GET /api/v1/me` (no token) | None | `401 Unauthorized` |
| Any other protected route (no token) | None | `401 Unauthorized` |

---

## Verification Commands

```bash
pnpm --filter @leaseKo/api typecheck   # zero TypeScript errors
pnpm --filter @leaseKo/api lint        # zero ESLint errors
pnpm --filter @leaseKo/api build       # successful production build
```

---

## Security Notes

- `CLERK_SECRET_KEY` is **server-side only** — never commit it, never expose it to the frontend
- JWT verification happens on every protected request — the backend never trusts the frontend's route protection
- The `userId` in the response comes exclusively from the verified JWT `sub` claim — not from the request body or any frontend-provided field
- All `401` errors return the same generic message — internal verification errors are never exposed

---

## For Future Features

### Feature 009 — Tenant Context (orgId extraction)

When a user is a member of a Clerk Organization, `auth.orgId` in the JWT is their `tenantId`. Feature 009 will:
1. Extract `orgId` from the verified JWT payload
2. Set `request.user.tenantId = orgId`
3. Reject requests with no `orgId` for tenant-required routes

### Future API Calls from Frontend

```typescript
// In a Next.js Server Component or Client Component:
const token = await getToken(); // from @clerk/nextjs
const data = await apiFetch('/me', { token });
```
