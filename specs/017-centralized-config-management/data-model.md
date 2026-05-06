# Data Model: Centralized Config Management

**Feature**: 017-centralized-config-management
**Branch**: `017-centralized-config-management`
**Date**: 2026-05-06

> This feature introduces no new database tables or Prisma models.
> The "data model" here describes the **typed configuration object graph** — the
> domain-specific interfaces that represent validated runtime configuration for
> each infrastructure concern.

---

## Config Namespace Hierarchy

```
ConfigRoot
├── app        → AppConfig
├── database   → DatabaseConfig
├── redis      → RedisConfig
└── clerk      → ClerkConfig
```

---

## AppConfig

**Namespace**: `app`
**File**: `apps/api/src/common/config/app.config.ts`
**Consumer**: `main.ts` (port, frontendUrl, nodeEnv)

```typescript
export interface AppConfig {
  nodeEnv: string;        // 'development' | 'production' | 'test' — defaults to 'development'
  port: number;           // defaults to 3001
  frontendUrl: string;    // required — used for CORS origin
}
```

**Validation Rules**:
- `NODE_ENV`: required, one of `development` | `production` | `test`, defaults to `development`
- `PORT`: required, integer, defaults to `3001`
- `FRONTEND_URL`: required, valid URI

---

## DatabaseConfig

**Namespace**: `database`
**File**: `apps/api/src/common/config/database.config.ts`
**Consumer**: `DatabaseModule` / `PrismaService` (startup validation only — Prisma reads `DATABASE_URL` from env directly via schema `env()` function)

```typescript
export interface DatabaseConfig {
  url: string;    // required — PostgreSQL connection string
}
```

**Validation Rules**:
- `DATABASE_URL`: required, non-empty string

**Note**: `PrismaService` does not inject `DatabaseConfig` directly. Prisma CLI and runtime both read `DATABASE_URL` from the process environment (via `env("DATABASE_URL")` in the Prisma schema). The `databaseConfig` factory validates the variable is present at NestJS startup — it does not pass the value to Prisma.

---

## RedisConfig

**Namespace**: `redis`
**File**: `apps/api/src/common/config/redis.config.ts`
**Consumer**: `QueuesModule` (future BullMQ integration)

```typescript
export interface RedisConfig {
  url: string;    // required — Redis connection string
}
```

**Validation Rules**:
- `REDIS_URL`: required, non-empty string

**Note**: `QueuesModule` is currently a placeholder. When BullMQ is integrated, it will inject `RedisConfig` to configure `BullModule.forRootAsync()`. The config factory ensures the variable is validated at startup even before BullMQ is active.

---

## ClerkConfig

**Namespace**: `clerk`
**File**: `apps/api/src/common/config/clerk.config.ts`
**Consumer**: `ClerkTokenVerifierService` (auth module infrastructure)

```typescript
export interface ClerkConfig {
  secretKey: string;              // required — SERVER-SIDE ONLY
  jwksUrl: string | undefined;    // optional — auto-derived from secretKey by Clerk SDK
  issuer: string | undefined;     // optional — for multi-domain JWT validation
  audience: string | undefined;   // optional — for audience-restricted JWT validation
}
```

**Validation Rules**:
- `CLERK_SECRET_KEY`: required, non-empty string
- `CLERK_JWKS_URL`: optional, valid URI or empty string (auto-derived from secret key)
- `CLERK_ISSUER`: optional, string (validated if present)
- `CLERK_AUDIENCE`: optional, string (validated if present)

**Security Rules**:
- `CLERK_SECRET_KEY` MUST NOT appear in application logs
- `CLERK_SECRET_KEY` MUST NOT be exposed to the frontend
- `CLERK_SECRET_KEY` MUST NOT be passed through HTTP response bodies

---

## Environment Variable Table

| Variable | Namespace.Field | Type | Required | Default | Description |
|---|---|---|---|---|---|
| `NODE_ENV` | `app.nodeEnv` | `string` | No | `development` | Runtime environment |
| `PORT` | `app.port` | `number` | No | `3001` | HTTP listen port |
| `FRONTEND_URL` | `app.frontendUrl` | `string` | Yes | — | CORS origin; Next.js dev URL |
| `DATABASE_URL` | `database.url` | `string` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | `redis.url` | `string` | Yes | — | Redis connection string |
| `CLERK_SECRET_KEY` | `clerk.secretKey` | `string` | Yes | — | Clerk server-side secret |
| `CLERK_JWKS_URL` | `clerk.jwksUrl` | `string \| undefined` | No | `undefined` | Clerk JWKS endpoint override |
| `CLERK_ISSUER` | `clerk.issuer` | `string \| undefined` | No | `undefined` | JWT issuer claim for validation |
| `CLERK_AUDIENCE` | `clerk.audience` | `string \| undefined` | No | `undefined` | JWT audience claim for validation |

---

## Config Dependency Graph

```
main.ts
  └─ ConfigService.get<AppConfig>('app')
       ├─ app.port          → app.listen(port)
       ├─ app.frontendUrl   → app.enableCors({ origin })
       └─ app.nodeEnv       → Swagger toggle

ClerkTokenVerifierService
  └─ ConfigService.get<ClerkConfig>('clerk')
       ├─ clerk.secretKey   → verifyToken({ secretKey })
       ├─ clerk.jwksUrl     → verifyToken({ jwtKey }) [optional]
       ├─ clerk.issuer      → verifyToken({ issuer }) [optional]
       └─ clerk.audience    → verifyToken({ audience }) [optional]

QueuesModule (future BullMQ)
  └─ ConfigService.get<RedisConfig>('redis')
       └─ redis.url         → BullModule.forRootAsync({ url })

PrismaService (no injection needed)
  └─ Prisma schema env("DATABASE_URL") reads directly from process.env
       └─ DatabaseConfig validates at startup only
```

---

## Files Created / Modified

| Action | Path | Description |
|---|---|---|
| **Modify** | `common/config/app.config.ts` | Replace flat factory with `registerAs('app', ...)` — removes `database.*` and `clerk.*` fields |
| **Create** | `common/config/database.config.ts` | `registerAs('database', ...)` factory |
| **Create** | `common/config/redis.config.ts` | `registerAs('redis', ...)` factory |
| **Create** | `common/config/clerk.config.ts` | `registerAs('clerk', ...)` factory with `CLERK_ISSUER` / `CLERK_AUDIENCE` |
| **Modify** | `common/config/validation.schema.ts` | Add `CLERK_ISSUER`, `CLERK_AUDIENCE` optional fields |
| **Modify** | `app.module.ts` | Update `load: [appConfig, databaseConfig, redisConfig, clerkConfig]` |
| **Modify** | `main.ts` | Replace `process.env.*` reads with `app.get(ConfigService)` |
| **Modify** | `modules/auth/infrastructure/clerk-token-verifier.service.ts` | Use `clerk.secretKey` namespace key + optional issuer/audience |
| **Modify** | `apps/api/.env.example` | Add `CLERK_ISSUER=` and `CLERK_AUDIENCE=` entries |
| **Modify** | `docs/backend-architecture.md` | Add config usage guide section |
