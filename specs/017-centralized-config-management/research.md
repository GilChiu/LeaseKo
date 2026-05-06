# Research: Centralized Config Management

**Feature**: 017-centralized-config-management
**Branch**: `017-centralized-config-management`
**Date**: 2026-05-06

## Decision Log

### D-001: Keep Joi for env validation (do not migrate to Zod)

- **Decision**: Retain Joi (`joi` package) for startup environment validation.
- **Rationale**: Joi is already installed, already integrated into `ConfigModule.forRoot({ validationSchema })`, and the existing schema covers 7 variables without issues. Migrating to Zod would change the validation API, require a new package, and add risk with zero functional benefit for this feature.
- **Alternatives Considered**:
  - Zod + `@nestjs/config` custom `validate` function: Well-supported pattern, would give richer TypeScript inference. Deferred — no active pain point.
  - class-validator: Not applicable for raw env var validation (designed for DTO objects).
- **Impact**: `validation.schema.ts` stays Joi-based; only adds `CLERK_ISSUER` and `CLERK_AUDIENCE` as optional fields.

---

### D-002: Use `registerAs()` from `@nestjs/config` for typed config namespaces

- **Decision**: Replace the single flat `appConfig` factory with four domain-scoped factories using `registerAs(namespace, factory)`.
- **Rationale**: `registerAs()` creates namespaced tokens that `ConfigService.get<T>('namespace')` can resolve with full TypeScript type inference. This is the official NestJS pattern for typed config and prevents string-key typos. Each namespace isolates a concern (app, database, redis, clerk).
- **Alternatives Considered**:
  - Single flat factory (current state): Already working but forces consumers to access unrelated keys. `ClerkTokenVerifierService` importing `databaseUrl` is possible but wrong.
  - Custom injection tokens with `@Inject()`: Possible but verbose and non-standard for this use case.
- **Impact**: Four new factory files; `AppModule.load` updated to include all four. Existing `appConfig` factory is replaced by `registerAs('app', ...)`.

---

### D-003: Refactor `main.ts` to use `ConfigService` via `app.get()`

- **Decision**: Replace direct `process.env.PORT` and `process.env.FRONTEND_URL` in `main.ts` with `app.get(ConfigService)` after `NestFactory.create()`.
- **Rationale**: By the time `NestFactory.create(AppModule)` resolves, `ConfigModule` has loaded and validated all env vars. Using `app.get(ConfigService)` gives access to the already-validated, already-typed values. This removes the last legitimate `process.env` usage from non-config files.
- **Alternatives Considered**:
  - Keep `process.env.PORT` in `main.ts` with a comment justifying it as "bootstrap-only": Simpler, but inconsistent with the "zero process.env outside config layer" goal. Also bypasses validation (the PORT read happens before NestJS validation).
  - Read from `app.get(ConfigService).getOrThrow<number>('app.port')`: This is the chosen approach.
- **Impact**: `main.ts` gains one `app.get(ConfigService)` call; removes 4 `process.env` reads. The `NODE_ENV` reads (`!== 'production'`) for Swagger toggle stay, replaced by `configService.get<string>('app.nodeEnv')`.

---

### D-004: `ClerkTokenVerifierService` uses `clerk.secretKey` namespace key

- **Decision**: Update `ClerkTokenVerifierService` to use `this.config.getOrThrow<string>('clerk.secretKey')` instead of `this.config.getOrThrow<string>('CLERK_SECRET_KEY')`.
- **Rationale**: Once `registerAs('clerk', ...)` is registered, the canonical access pattern is `namespace.fieldName`. The flat env-var-style key (`'CLERK_SECRET_KEY'`) still works in `ConfigService` because `ConfigModule` maps raw env vars alongside factories, but using it bypasses the typed namespace and the validated/transformed value. Using the namespaced key is consistent with D-002.
- **Alternatives Considered**:
  - Keep `'CLERK_SECRET_KEY'` string: Works, but inconsistent with the new pattern being established. Leaves the door open for future consumers to bypass the clerk namespace.
- **Impact**: One line change in `clerk-token-verifier.service.ts`.

---

### D-005: `.gitignore` is already correct — no changes needed

- **Decision**: The root `.gitignore` already contains `.env`, `.env.local`, `.env.*.local` as bare patterns. In Git, a pattern without a leading slash matches at any depth in the repository tree, so `apps/api/.env` is already protected. No additional entries needed.
- **Rationale**: Verified by inspecting `.gitignore` lines 12–17. The `!.env.example` and `!.env.docker` negations correctly preserve tracked example files.
- **Impact**: No `.gitignore` changes. Documentation task covers explaining this to developers.

---

### D-006: No `contracts/` directory needed for this feature

- **Decision**: Skip creation of `contracts/` for this feature.
- **Rationale**: This feature creates no new external API endpoints, no public library interfaces, and no inter-service contracts. It is purely an internal infrastructure refactor of how the backend reads environment variables.
- **Impact**: `specs/017-centralized-config-management/contracts/` will not be created.

---

### D-007: `CLERK_ISSUER` and `CLERK_AUDIENCE` are optional with `undefined` defaults

- **Decision**: Add `CLERK_ISSUER` and `CLERK_AUDIENCE` to the Joi schema as `optional().allow('')` and to `clerk.config.ts` as `string | undefined`. The `verifyToken` call passes them only when defined.
- **Rationale**: These fields are needed for advanced Clerk JWT validation (multi-domain setups) but are not required for the standard single-domain Clerk integration that the project currently uses. Failing startup on their absence would break local development.
- **Alternatives Considered**:
  - Mark as required: Too strict for the current usage; breaks existing `.env` setups.
  - Omit entirely: Missed opportunity to document and support future multi-domain scenarios.
- **Impact**: Two new optional vars in schema, two new optional fields in `ClerkConfig` interface. The `verifyToken` call in `ClerkTokenVerifierService` passes them only when defined (using `?? undefined`).

---

## Technology Versions Confirmed

| Package | Version | Notes |
|---|---|---|
| `@nestjs/config` | `^3.0.0` | Already installed — `registerAs` supported |
| `joi` | `^17.x` | Already installed |
| `@clerk/backend` | `3.4.4` | `verifyToken` accepts optional `issuer`/`audience` |
| TypeScript | `5.0` | Strict mode enforced |

---

## Process.env Audit Results

**Files with `process.env` access** (grep result from `apps/api/src/`):

| File | Occurrences | Status |
|---|---|---|
| `common/config/app.config.ts` | 7 | Legitimate (config layer) — will be split into 4 files, all stays in config layer |
| `main.ts` | 4 | Will be refactored to `ConfigService` in Phase 1 |

**Result**: No violations found outside the config layer or `main.ts`. Refactoring `main.ts` eliminates all `process.env` usage from non-config files.

---

## NestJS `registerAs` Pattern (Reference)

```typescript
// clerk.config.ts
import { registerAs } from '@nestjs/config';

export interface ClerkConfig {
  secretKey: string;
  jwksUrl: string | undefined;
  issuer: string | undefined;
  audience: string | undefined;
}

export const clerkConfig = registerAs('clerk', (): ClerkConfig => ({
  secretKey: process.env.CLERK_SECRET_KEY!,
  jwksUrl: process.env.CLERK_JWKS_URL || undefined,
  issuer: process.env.CLERK_ISSUER || undefined,
  audience: process.env.CLERK_AUDIENCE || undefined,
}));
```

```typescript
// In a consuming service
constructor(private readonly config: ConfigService) {}

const clerkConf = this.config.get<ClerkConfig>('clerk');
// OR for a specific required field:
const secretKey = this.config.getOrThrow<string>('clerk.secretKey');
```

```typescript
// AppModule registration
ConfigModule.forRoot({
  isGlobal: true,
  load: [appConfig, databaseConfig, redisConfig, clerkConfig],
  validationSchema,
  validationOptions: { allowUnknown: true, abortEarly: true },
})
```
