# Quickstart: Shared Config, ESLint, and Environment Setup

**Feature**: `005-shared-config-eslint-env`

---

## Setup (New Developer)

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Create local environment files**

   Copy the example files and fill in your values:

   ```bash
   # Backend
   cp apps/api/.env.example apps/api/.env

   # Frontend
   cp apps/web/.env.example apps/web/.env.local
   ```

   Minimum required values for local development:

   | File                  | Variable              | Value                                                   |
   | --------------------- | --------------------- | ------------------------------------------------------- |
   | `apps/api/.env`       | `DATABASE_URL`        | `postgresql://postgres:postgres@localhost:5432/leaseKo` |
   | `apps/api/.env`       | `REDIS_URL`           | `redis://localhost:6379`                                |
   | `apps/api/.env`       | `FRONTEND_URL`        | `http://localhost:3000`                                 |
   | `apps/web/.env.local` | `NEXT_PUBLIC_API_URL` | `http://localhost:3001`                                 |

   Clerk variables (`CLERK_SECRET_KEY`, `CLERK_JWKS_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) can be left empty until Epic 2.

3. **Start infrastructure** (PostgreSQL + Redis)

   ```bash
   pnpm db:up
   ```

4. **Start all apps**

   ```bash
   pnpm dev
   ```

---

## Development Workflow

### Run lint across all workspaces

```bash
pnpm lint
```

### Run type-check across all workspaces

```bash
pnpm typecheck
```

### Run both (standard before committing)

```bash
pnpm lint ; pnpm typecheck
```

### Check formatting (CI mode — no writes)

```bash
pnpm format:check
```

### Auto-format all files

```bash
pnpm format
```

---

## Troubleshooting

### Missing environment variable on API startup

```
Config validation error: "FRONTEND_URL" is required
```

→ Ensure `apps/api/.env` exists and contains `FRONTEND_URL=http://localhost:3000`.

### Missing environment variable in Next.js

```
Error: NEXT_PUBLIC_API_URL is required. Add it to apps/web/.env.local
```

→ Ensure `apps/web/.env.local` exists and contains `NEXT_PUBLIC_API_URL=http://localhost:3001`.

### TypeScript error in `typecheck`

The `pnpm typecheck` command will report the exact file and line. Both apps inherit `strict: true` from the shared base config — all type errors must be resolved before merging.

### ESLint `no-console` error in `apps/api`

```
error  Unexpected console statement  no-console
```

→ Replace `console.log(...)` with NestJS `Logger`:

```typescript
import { Logger } from '@nestjs/common';
private readonly logger = new Logger(MyService.name);
this.logger.log('message');
```

Bootstrap logging in `src/main.ts` is exempt from this rule.

---

## Where Things Live

| What                      | Where                                             |
| ------------------------- | ------------------------------------------------- |
| Shared TypeScript configs | `packages/config/tsconfig/`                       |
| Shared ESLint base        | `packages/config/eslint/index.js`                 |
| NestJS ESLint overrides   | `packages/config/eslint/nestjs.js`                |
| Frontend env template     | `apps/web/.env.example`                           |
| Backend env template      | `apps/api/.env.example`                           |
| Frontend env validation   | `apps/web/src/lib/env.ts`                         |
| Backend env validation    | `apps/api/src/common/config/validation.schema.ts` |
