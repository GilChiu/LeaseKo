# Data Model: Monorepo Initialization

**Feature**: `001-monorepo-init`
**Date**: 2026-05-02

---

## Scope

This feature contains **no application data models**. No database tables, Prisma schemas, or entity definitions are created in this phase. PostgreSQL is provisioned as a running Docker container but is empty — no migrations, no schema, no seed data.

The data model work begins in **Epic 4: Data Layer (Prisma)**, where the `User` and `Tenant` entities will be defined with `tenant_id` isolation.

---

## Configuration Data Structures

While there are no persisted entities, the following configuration structures define the shape of runtime environment data consumed by the apps:

### Environment Variables (apps/api)

| Variable       | Type                                           | Purpose                                            | Required          |
| -------------- | ---------------------------------------------- | -------------------------------------------------- | ----------------- |
| `PORT`         | integer                                        | Port for the NestJS HTTP server                    | Yes               |
| `NODE_ENV`     | string (`development` / `production` / `test`) | Runtime environment flag                           | Yes               |
| `DATABASE_URL` | string (PostgreSQL connection URL)             | Prisma database connection (used in future Epic 4) | Yes (provisioned) |
| `REDIS_URL`    | string (Redis connection URL)                  | Redis connection (used in future Epic 9)           | Yes (provisioned) |

### Environment Variables (apps/web)

| Variable              | Type         | Purpose                    | Required |
| --------------------- | ------------ | -------------------------- | -------- |
| `NEXT_PUBLIC_API_URL` | string (URL) | Base URL of the NestJS API | Yes      |
| `NODE_ENV`            | string       | Runtime environment flag   | Yes      |

> All `NEXT_PUBLIC_*` variables are inlined at build time by Next.js and exposed to the browser. Non-public variables are server-only.

---

## Future Data Model Preview

The following entities will be introduced in Epic 4 and are listed here for structural awareness only — they are NOT implemented in this phase:

- **Tenant**: Represents an organization (maps to Clerk `orgId`). All other entities will have a `tenant_id` foreign key referencing this entity.
- **User**: Represents an authenticated user (maps to Clerk `userId`). Belongs to one or more tenants via Clerk organization membership.

---

## Notes

- No Prisma client is initialized in this phase.
- No database migrations exist at the end of this feature.
- The `DATABASE_URL` environment variable is documented in `.env.example` so subsequent features can plug in Prisma without configuration changes.
