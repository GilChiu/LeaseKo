# Research: Local Infrastructure — Docker, PostgreSQL, Redis

**Feature**: 006-docker-local-infra  
**Date**: 2026-05-02  
**Phase**: 0 — Pre-Design Research

---

## D1 — Docker Compose File Location

**Decision**: Keep `infra/docker-compose.yml` as-is.

**Rationale**: The file already exists at this path. The root `package.json` `db:up` / `db:down` scripts already reference it with `-f infra/docker-compose.yml`. Moving it would break those scripts and provides no benefit.

**Alternatives considered**:

- Root-level `docker-compose.yml`: Simpler path references, but mixes infrastructure concerns with application root. Rejected — `infra/` separation is cleaner for a monorepo.
- `infra/docker/docker-compose.yml`: More nested, no additional value. Rejected.

---

## D2 — Root Script Naming Prefix

**Decision**: Keep `db:` prefix for all Docker convenience scripts (`db:up`, `db:down`, `db:logs`, `db:ps`, `db:reset`).

**Rationale**: `db:up` and `db:down` already exist with the `db:` prefix. Consistency within the root `package.json` is more important than following the spec prompt's `docker:` suggestion. Introducing a second prefix creates confusion.

**Alternatives considered**:

- `docker:` prefix (as suggested in spec prompt): Would require renaming `db:up` / `db:down` and updating any documentation that references them. Rejected — no migration benefit.

---

## D3 — PostgreSQL Database Credentials and Name

**Decision**: Keep current local development defaults: `postgres` / `postgres` / `leaseKo`.

**Rationale**: These defaults are already committed in `infra/.env.docker` and documented in `apps/api/.env.example`. Renaming to `property_admin / property_password / property_saas` (as referenced in the spec prompt) would require updating all example files and break any existing local environments. The spec prompt's values were illustrative examples, not requirements. The production naming decision belongs to Feature 007 (Prisma schema setup).

**Alternatives considered**:

- Rename to `property_admin:property_password@localhost:5432/property_saas`: Descriptive, matches SaaS context. Deferred to Feature 007 when the Prisma schema is formally established and DATABASE_URL becomes the canonical migration target.

---

## D4 — Adminer Image Tag

**Decision**: Pin `adminer` to `adminer:4` (tracks the stable v4 series, avoids `latest` drift).

**Rationale**: `adminer:latest` violates the spec requirement for version-pinned images. `adminer:4` pins to the v4 LTS-equivalent stream, which is the stable major series used in production Docker deployments.

**Alternatives considered**:

- Full version pin `adminer:4.17.1`: More exact but requires manual updates. `adminer:4` is sufficient for a developer-only GUI tool.
- Remove Adminer entirely: Valid — it's not required by the spec. Retained as a developer convenience; adds negligible overhead.

---

## D5 — Redis Named Volume

**Decision**: Keep `redis_data` named volume already present in the Docker Compose file.

**Rationale**: BullMQ persists pending, delayed, and failed jobs in Redis. Without a volume, a container restart during development loses all queued jobs. This is a noisy developer experience. The spec says "no Redis volume unless justified" — this is the justification.

**Alternatives considered**:

- No Redis volume: Simpler, but job state lost on every restart. Rejected due to BullMQ dependency.

---

## D6 — `infra/.env.docker` Committed File

**Decision**: Keep `infra/.env.docker` committed as-is.

**Rationale**: The root `.gitignore` explicitly allows it with `!.env.docker`. The file contains only safe local development defaults (`postgres:postgres`). It acts as the `.env.example` equivalent for the Docker Compose file.

**Security note**: This is safe only because these are local-development-only values. If a real production password were added here, it would be a security violation. The plan must document this constraint clearly.

**Alternatives considered**:

- Rename to `infra/.env.docker.example` and add `infra/.env.docker` to `.gitignore`: Conventional pattern, but breaks existing `db:up` script and the committed `.gitignore` whitelist. Rejected for this feature; could be done as a maintenance cleanup task.

---

## D7 — Backend Env Validation (DATABASE_URL + REDIS_URL)

**Decision**: No code changes needed. Verify and document only.

**Rationale**: `apps/api/src/common/config/validation.schema.ts` already validates `DATABASE_URL` and `REDIS_URL` as required using Joi. The NestJS `ConfigModule` is configured with `abortEarly: true`, so missing variables cause immediate startup failure with a descriptive error.

**Verification**: Confirmed by reading the schema — both are `Joi.string().required()` with no `.allow('')`.

---

## D8 — Backend Connection Verification Approach

**Decision**: Configuration-readiness verification only (no live ping). Document the approach for real connection checks in Feature 007 (Prisma) and Feature 008 (BullMQ).

**Rationale**: Prisma and BullMQ are not installed yet. A live DB/Redis ping would require adding client libraries as a placeholder — over-engineering for this task. The existing health endpoint (`GET /api/v1/health`) confirms the API process is running. The NestJS startup validates env vars at boot. Together, these provide sufficient verification that the backend is correctly configured.

**Future extension**: Feature 007 (Prisma) will add `PrismaService.onModuleInit()` with `$connect()`, which is the correct place for a real DB connectivity check. Feature 008 (BullMQ) will add a Redis connection test during module init.

---

## Summary

| Decision                   | Outcome                                                 |
| -------------------------- | ------------------------------------------------------- |
| D1 Docker Compose location | Keep `infra/docker-compose.yml`                         |
| D2 Script prefix           | Keep `db:` prefix, add missing scripts                  |
| D3 DB credentials          | Keep `postgres/postgres/leaseKo` until Feature 007      |
| D4 Adminer tag             | Pin to `adminer:4`                                      |
| D5 Redis volume            | Keep `redis_data` (BullMQ job persistence)              |
| D6 `.env.docker` committed | Keep as-is, document the constraint                     |
| D7 Env validation          | Already implemented — verify and document               |
| D8 Verification approach   | Config-readiness only; no live ping until Prisma/BullMQ |
