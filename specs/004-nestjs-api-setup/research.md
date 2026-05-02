# Research: NestJS API Foundation Setup

**Feature**: 004-nestjs-api-setup
**Date**: 2026-05-02

---

## Research Question 1 — Config validation approach: Joi vs class-validator

**Context**: `@nestjs/config` supports two validation strategies: a `validationSchema` option accepting a Joi `ObjectSchema`, and a `validate` function option for custom validation (often using `class-validator` + `plainToInstance`).

**Decision**: Use `@nestjs/config` with a `Joi.ObjectSchema` passed to `validationSchema`.

**Rationale**:

- NestJS official documentation uses Joi as the primary example for ConfigModule validation
- Joi schema is terse and co-locates all env-var constraints in one file
- `abortEarly: true` makes startup errors clear — the process exits immediately naming the missing/invalid variable
- No additional transformation step or plain-to-class overhead at bootstrap

**Alternatives considered**:

- `validate` + `class-validator`: More verbose but enables the same DTO-style validation used elsewhere in the app. Rejected for this task — unnecessary complexity for a simple env config map; Joi is sufficient and idiomatic at this stage.

**Package required**: `joi` (`pnpm add joi`). Joi ≥17 ships its own TypeScript definitions; no `@types/joi` needed.

---

## Research Question 2 — Global exception filter: catch-all vs typed

**Context**: NestJS allows either `@Catch()` (catch everything) or `@Catch(HttpException)` (typed). The project needs a single, consistent error envelope for all error types.

**Decision**: Use a single `@Catch()` filter (`GlobalExceptionFilter`) that handles both `HttpException` subclasses and unknown runtime errors.

**Rationale**:

- A single filter ensures 100% of error responses — 4xx, 5xx, and unexpected crashes — return the standard `{ statusCode, message, error? }` envelope
- `HttpException` branch extracts the status code and message from the exception; unknown errors default to 500 and log the stack trace via `Logger`
- Raw stack traces must never appear in the HTTP response body — the catch-all filter is the enforcement point

**Implementation notes**:

- Register via `app.useGlobalFilters(new GlobalExceptionFilter())` in `main.ts`, not as a provider, so it applies before module initialization errors too
- `Logger` logs full stack for non-`HttpException` errors at `error` level; safe for production

**Alternatives considered**:

- Separate `HttpExceptionFilter` + fallback: More granular but creates two maintenance surfaces. Rejected — the single filter handles all cases and is simpler.

---

## Research Question 3 — Prisma placeholder pattern

**Context**: The Prisma module must exist and be registered without causing startup failure when PostgreSQL is not running.

**Decision**: Create `PrismaService` as an `@Injectable()` class that only logs on `onModuleInit` — no `$connect()` call until the real Prisma integration (Feature 005).

**Rationale**:

- `PrismaClient.$connect()` throws if the DB is unreachable — calling it here would break dev startup when Docker isn't running
- A logging-only `onModuleInit` satisfies the module lifecycle contract without any external dependency
- The service is `@Global()` so future repository implementations can inject it without listing `DatabaseModule` in every module's imports

**Alternatives considered**:

- `onModuleInit` with try/catch around `$connect()`: Would silently swallow connection errors. Rejected — misleading in dev.
- No `onModuleInit` at all: Simpler, but provides no feedback to the developer that the module loaded. Rejected in favour of a startup log.

---

## Research Question 4 — BullMQ placeholder pattern

**Decision**: An empty `@Module({})` class with a JSDoc comment describing what the epic will add. No actual queue registration, no `BullModule.forRootAsync()`.

**Rationale**:

- Zero external dependencies at module init time; startup safe even without Redis running
- The module entry point is established — future tasks simply add `imports: [BullModule.forRootAsync(...)]` to this file

**Alternatives considered**:

- Skip the module entirely until Feature 007: Leaves no clear entry point for the BullMQ integration task. Rejected — module establishment is the deliverable for this task.

---

## Research Question 5 — CORS variable: FRONTEND_URL vs CORS_ORIGIN

**Context**: `main.ts` currently reads `process.env.CORS_ORIGIN`. The spec and constitution reference `FRONTEND_URL`.

**Decision**: Rename to `FRONTEND_URL` throughout (`main.ts`, `.env.example`, Joi validation schema).

**Rationale**:

- `FRONTEND_URL` is semantically clearer — it names the service, not the header
- Aligns with the constitution and spec
- No production deployments exist yet; the rename has zero migration cost

---

## Research Question 6 — Jest testing setup

**Decision**: Add `jest`, `@types/jest`, `ts-jest`, and `@nestjs/testing` as devDependencies. Create `jest.config.ts` in `apps/api`. Add a single unit test for `HealthController`.

**Rationale**:

- `ts-jest` enables Jest to consume TypeScript directly without a separate compile step
- A health controller unit test validates both the test infrastructure and the health response shape (including the new `service` field)
- Keeping the test suite minimal for this task avoids over-building — integration and E2E tests belong to their respective feature tasks

**Test configuration**:

- `rootDir: 'src'`
- `testRegex: '.*\\.spec\\.ts$'`
- `moduleNameMapper` for `@/*` path alias

---

## Research Question 7 — Auth and tenants module boundaries

**Decision**: Scaffold `auth` and `tenants` as NestJS modules with four empty sub-layers (`domain/`, `application/`, `infrastructure/`, `presentation/`) and a `.gitkeep` in each. Register both modules in `AppModule`.

**Rationale**:

- Establishes the bounded context boundaries before any feature code is written
- Prevents developers from placing code in the wrong layer because the correct location is visually obvious
- Empty modules with `.gitkeep` files are git-trackable and do not cause TypeScript errors

---

## Summary of Decisions

| Question           | Decision                                         |
| ------------------ | ------------------------------------------------ |
| Config validation  | `@nestjs/config` + Joi `validationSchema`        |
| Exception filter   | Single `@Catch()` `GlobalExceptionFilter`        |
| Prisma placeholder | `PrismaService` with logging-only `onModuleInit` |
| BullMQ placeholder | Empty `@Module({})` with documentation           |
| CORS variable      | Rename `CORS_ORIGIN` → `FRONTEND_URL`            |
| Testing            | `jest` + `ts-jest` + health controller unit test |
| Module scaffold    | Empty 4-layer dirs + `.gitkeep` + module files   |
