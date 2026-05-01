# Research: Monorepo Initialization

**Feature**: `001-monorepo-init`
**Date**: 2026-05-02
**Status**: Complete — all decisions resolved

---

## 1. Turborepo 2.x Pipeline Configuration

**Decision**: Use Turborepo 2.x `tasks` key syntax (replaces deprecated `pipeline` from v1).

**Rationale**: Turborepo v2 replaced the `pipeline` top-level key with `tasks`. The new syntax provides `persistent` (for dev servers that never exit), `interactive` (for TTY-based watchers), and refined `cache` + `inputs`/`outputs` configuration per task. Dev servers must be marked `cache: false` and `persistent: true` to prevent Turborepo from caching or incorrectly sequencing them.

**Canonical turbo.json**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "tsconfig.json"],
      "cache": true
    },
    "lint": {
      "cache": true,
      "outputs": []
    },
    "test": {
      "cache": false,
      "outputs": []
    }
  }
}
```

**Key decisions**:
- `build` uses `dependsOn: ["^build"]` so shared packages build before apps that depend on them.
- `.next/cache/**` is excluded from outputs to avoid caching Next.js's internal incremental build cache (large, not portable).
- `test` is not cached because test results depend on runtime state (e.g., DB).
- `globalEnv` is omitted at the root; apps declare their own env dependencies in per-package `turbo.json` extensions if needed.

**Alternatives considered**:
- v1 `pipeline` key: Deprecated; causes warnings in Turborepo 2+.
- Per-app `turbo.json` with `extends: ["//"]`: Added complexity, not needed at this stage.

---

## 2. pnpm Workspace Configuration

**Decision**: `pnpm-workspace.yaml` with `apps/*` and `packages/*` globs; internal packages referenced via `workspace:*` protocol.

**Rationale**: pnpm's workspace protocol ensures internal packages are resolved from the monorepo rather than the npm registry, preventing accidental version drift. `private: true` at the root prevents the root package from being published.

**pnpm-workspace.yaml**:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Package naming convention**: `@leaseKo/<name>` (e.g., `@leaseKo/web`, `@leaseKo/api`, `@leaseKo/config`).

**Cross-package dependency**: `"@leaseKo/config": "workspace:*"` in app `package.json`.

**Alternatives considered**:
- `packages/*` only (no `apps/*`): Would force apps into `packages/` — breaks the convention of separating deployable apps from shared tooling.
- npm/yarn workspaces: Ruled out per project constraint (pnpm only).

---

## 3. NestJS Initialization in a Turborepo Workspace

**Decision**: Initialize NestJS as a standalone app in `apps/api/` using the NestJS CLI, **not** using NestJS's own monorepo mode (`nest generate app`). Turborepo is the monorepo orchestrator.

**Rationale**: NestJS monorepo mode (via `nest-cli.json` `projects` array) conflicts with pnpm workspaces and Turborepo by introducing a parallel orchestration layer. Since Turborepo handles all task orchestration, the NestJS app is treated as a regular standalone application in the `apps/api/` directory. The `nest-cli.json` at `apps/api/` references only a single project.

**Module folder structure** (Clean Architecture, per bounded context):
```
apps/api/src/
├── modules/
│   ├── health/                   # scaffolded in this phase
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   └── (future: auth/, tenants/, properties/)
├── common/                       # shared guards, filters, decorators
│   └── (future: guards/, filters/, decorators/, middleware/)
├── app.module.ts
└── main.ts
```

Each future module will follow:
```
modules/<name>/
├── domain/           # entities, value objects, interfaces (no framework imports)
├── application/      # use cases, application services, DTOs
├── infrastructure/   # Prisma repositories, external adapters
└── presentation/     # controllers, NestJS decorators
```

**Alternatives considered**:
- NestJS monorepo mode: Rejected — conflicts with Turborepo orchestration.
- Nx: Rejected — significantly more complex and heavyweight than Turborepo for this scope.

---

## 4. Next.js 14 App Router Structure

**Decision**: Next.js 14 with App Router (`app/` directory), route groups for auth and dashboard sections, `src/` directory enabled.

**Rationale**: The App Router is the current default for new Next.js projects. Route groups (`(auth)`, `(dashboard)`) allow separate layouts per section without affecting URL paths. The `src/` directory is enabled for consistency with the NestJS app structure.

**Folder structure**:
```
apps/web/src/
├── app/
│   ├── layout.tsx            # root layout
│   ├── page.tsx              # home / marketing
│   ├── (auth)/               # login, signup — Clerk integration (future)
│   │   └── layout.tsx
│   └── (dashboard)/          # protected tenant pages (future)
│       └── layout.tsx
├── components/
│   └── ui/                   # design system primitives (future)
├── lib/                      # API client utilities, hooks (future)
└── middleware.ts             # Clerk auth middleware (future)
```

**Alternatives considered**:
- Pages Router: Deprecated path for new projects; App Router is now standard.
- Flat file structure without route groups: Less maintainable as the app grows.

---

## 5. Docker Compose for Local Infrastructure

**Decision**: Docker Compose v2 with PostgreSQL 16-alpine and Redis 7-alpine, health checks, named volumes, and environment variable substitution.

**Rationale**: Alpine-based images are smaller and faster to pull. Health checks allow dependent services to wait for readiness before the app starts. Named volumes persist data across `docker-compose down` (without `--volumes`). Environment variable substitution via `${VAR:-default}` lets developers override settings without editing the compose file.

**Services**:
| Service | Image | Port | Volume |
|---------|-------|------|--------|
| postgres | postgres:16-alpine | 5432 | `postgres_data` |
| redis | redis:7-alpine | 6379 | `redis_data` |

**Adminer**: Included as an optional service (port 8080) for database inspection during development. Can be removed in production.

**Alternatives considered**:
- PostgreSQL 15: No compelling reason; 16 is current stable with performance improvements.
- Redis with password: Not needed for local dev; must be added for staging/production.
- Kubernetes (local): Overkill for development; Docker Compose is simpler.

---

## 6. TypeScript Shared Configuration

**Decision**: Shared `packages/config/tsconfig/` with three configs: `base.json` (shared), `nextjs.json` (extends base, adds JSX), `nestjs.json` (extends base, adds decorator metadata).

**Rationale**: NestJS requires `experimentalDecorators: true` and `emitDecoratorMetadata: true`. Next.js requires `jsx: "preserve"` for the React transform. A single base config handles strict mode and path resolution; the two specialized configs layer on framework-specific options without duplicating everything.

**Key base settings**:
- `target: "ES2020"` — compatible with Node 20 LTS and modern browsers
- `strict: true` — all strict type checks enabled
- `experimentalDecorators: true` + `emitDecoratorMetadata: true` — in the nestjs config only
- `moduleResolution: "bundler"` — for Next.js; `"node16"` for NestJS
- `paths` — not in the shared base (each app declares its own `@/*` alias)

**Alternatives considered**:
- Single `tsconfig.base.json` covering all cases: `moduleResolution` conflicts between Next.js (bundler) and NestJS (node16) make a single file impractical.
- `noUnusedLocals: true`: Enabled in base; can be relaxed per app if needed during rapid development.

---

## 7. Port Allocation

**Decision**: Standard ports; all configurable via environment variables.

| Service | Default Port | Env Variable |
|---------|-------------|-------------|
| Next.js web app | 3000 | `PORT` (Next.js) |
| NestJS API | 3001 | `PORT` (NestJS `main.ts`) |
| PostgreSQL | 5432 | `DB_PORT` |
| Redis | 6379 | `REDIS_PORT` |
| Adminer (optional) | 8080 | — |

**Port 3000 conflict note**: Next.js defaults to 3000 and will auto-increment to 3001 if 3000 is busy. To avoid NestJS vs Next.js port collision, NestJS is explicitly started on `3001`. Both ports must be documented in `.env.example`.

**Alternatives considered**:
- NestJS on 8000/8001: Less conventional; 3001 is the accepted pair for a Next.js + NestJS stack.
- Single port with a reverse proxy (nginx): Overkill for local dev; appropriate for staging.
