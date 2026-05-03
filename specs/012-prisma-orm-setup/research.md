# Research: Prisma ORM Installation and Database Connection

**Feature**: 012 — Prisma ORM Setup
**Created**: 2026-05-03
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## Decision 1: Package Filter Name

**Decision**: Use `--filter @leaseKo/api` (full package name) for pnpm workspace commands. Short form `--filter api` also works due to pnpm substring matching.

**Evidence**: `apps/api/package.json` has `"name": "@leaseKo/api"`. Both `pnpm --filter @leaseKo/api` and `pnpm --filter api` resolve correctly.

**Rationale**: Use short form `--filter api` in docs for readability; use full form in scripts for explicitness.

**Alternatives Considered**: `--filter leaseKo/api` — rejected, not the correct pnpm syntax.

---

## Decision 2: PrismaModule Scope — Global vs Explicit Import

**Decision**: Keep `@Global()` on `DatabaseModule` (existing). This is already the pattern established in the placeholder.

**Evidence**: `apps/api/src/database/prisma/prisma.module.ts` is already `@Global()` and already imported in `AppModule`. The module is named `DatabaseModule` and exported via `import { DatabaseModule } from "./database/prisma/prisma.module"`.

**Rationale**: A global database provider avoids re-importing `DatabaseModule` in every infrastructure module. The `@Global()` pattern is appropriate for singleton infrastructure like the database connection — it is already an established convention in this project.

**Alternatives Considered**: Explicit import per infrastructure module — rejected because it adds boilerplate without benefit for a singleton service.

---

## Decision 3: PrismaService Lifecycle Hooks

**Decision**: `PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy`. Call `this.$connect()` in `onModuleInit` and `this.$disconnect()` in `onModuleDestroy`.

**Rationale**: NestJS module lifecycle hooks are the correct integration point. `$connect()` on init ensures the connection pool is ready before the first request. `$disconnect()` on destroy prevents connection leaks during graceful shutdown. This is the canonical NestJS + Prisma pattern from the official Prisma docs.

**Alternatives Considered**:
- No explicit `$connect()` — Prisma lazily connects on first query. Rejected: lazy connection delays surface connection errors until first use rather than at startup, making startup health checks unreliable (SC-005).
- `enableShutdownHooks()` on the NestJS app — rejected as redundant when `OnModuleDestroy` is implemented correctly.

---

## Decision 4: schema.prisma Location

**Decision**: `apps/api/prisma/schema.prisma` — the Prisma default location relative to the working directory when CLI commands are run from `apps/api`.

**Rationale**: Prisma CLI looks for `prisma/schema.prisma` relative to the current working directory. Running from `apps/api` means the schema is at `apps/api/prisma/schema.prisma`. This matches the default and requires no `--schema` flag.

**Alternatives Considered**: Custom path with `--schema apps/api/prisma/schema.prisma` at root — rejected because it would require a `--schema` flag on every command or a `prisma.schemaPath` in `package.json`.

---

## Decision 5: Root `package.json` Scripts to Add

**Decision**: Add `db:generate`, `db:migrate`, `db:studio`, `db:validate`, `db:format` to root `package.json` alongside existing `db:up`, `db:down`, `db:logs`, `db:ps`, `db:reset`.

**Evidence**: Root `package.json` already has `db:up/down/logs/ps/reset` for Docker. Adding Prisma-specific `db:*` scripts maintains consistency in the naming convention.

**Rationale**: Developers can use `pnpm db:generate` from the root without needing to `cd apps/api` first.

---

## Decision 6: DATABASE_URL in .env.example

**Decision**: `DATABASE_URL` is already present in `apps/api/.env.example` as `postgresql://postgres:postgres@localhost:5432/leaseKo`. This matches the Docker Compose credentials. No change needed to `.env.example` itself.

**Evidence**: Read `apps/api/.env.example` — `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leaseKo` already exists.

**Action**: Confirm the Docker Compose PostgreSQL credentials match. If they match, no update needed. If they differ, update `.env.example` to match.

---

## Decision 7: Prisma Version

**Decision**: Install latest stable Prisma 5.x (`prisma@latest` / `@prisma/client@latest`). No pinned version.

**Rationale**: Prisma 5.x is the current stable release. It supports PostgreSQL fully, has `updateMany`/`deleteMany` patterns aligned with the tenant-safe query strategy from Feature 011, and the `@map`/`@@map` conventions documented in `docs/tenant-isolation.md`.

**Alternatives Considered**: Prisma 4.x — rejected, it is EOL. Pinned version — rejected, no project-specific reason to pin yet.

---

## All NEEDS CLARIFICATION Resolved

| # | Question | Answer |
|---|----------|--------|
| 1 | pnpm filter name? | `--filter api` (short) |
| 2 | Global or explicit PrismaModule? | Keep `@Global()` (already established) |
| 3 | PrismaService lifecycle? | `OnModuleInit` + `OnModuleDestroy` with `$connect`/`$disconnect` |
| 4 | schema.prisma location? | `apps/api/prisma/schema.prisma` (Prisma default) |
| 5 | Root scripts to add? | `db:generate`, `db:migrate`, `db:studio`, `db:validate`, `db:format` |
| 6 | .env.example update needed? | Verify Docker credentials match — likely no change needed |
| 7 | Prisma version? | Latest stable 5.x |
