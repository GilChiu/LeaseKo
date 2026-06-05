<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/039-property-detail-units/plan.md
<!-- SPECKIT END -->

# LeaseKo — Claude Code Context

## Project

Property Management SaaS. Monorepo: pnpm + Turborepo.

- **Backend**: NestJS (`apps/api`) — all business logic lives here
- **Frontend**: Next.js (`apps/web`) — presentation layer only
- **Auth**: Clerk (identity) + backend guards (authorization)
- **ORM**: Prisma — infrastructure-only, behind repository interfaces
- **Database**: PostgreSQL + Redis/BullMQ
- **Testing**: Jest (unit + integration + e2e)

## Architecture Rules (Non-Negotiable)

See [`.specify/memory/constitution.md`](.specify/memory/constitution.md) for the full LeaseKo constitution.

Critical rules:
1. All business logic in NestJS only. No domain logic in Next.js.
2. Clean Architecture layers: `domain → application → infrastructure → presentation`
3. Prisma accessed only through repository interfaces — never directly in controllers or use cases.
4. Every table has `tenant_id`. Every query filters by `tenant_id`. No exceptions.
5. `tenantId` comes from the verified JWT request context only — never from body, query, or header.
6. `BACKLOG.md` is updated only after verified implementation (lint + typecheck + build + test pass).

## SpecKit Workflow

This project uses [SpecKit](docs/speckit-workflow.md) for spec-driven development.

Current feature being worked on: see `.specify/feature.json`

Workflow order (do not skip steps):
1. `/speckit-specify <description>` — define scope
2. `/speckit-plan` — create technical plan (includes Constitution Check)
3. Approve plan before proceeding
4. `/speckit-implement` — implement only after plan is approved
5. Run `pnpm lint && pnpm typecheck && pnpm build && pnpm --filter @leaseKo/api test`
6. Update `BACKLOG.md` only after all checks pass

## Key Directories

```
apps/api/src/
  common/         → shared guards, decorators, filters, utils
  modules/        → domain modules (auth, users, properties, ...)
    <module>/
      domain/         → entities, value objects
      application/    → use cases
      infrastructure/ → Prisma repositories
      presentation/   → controllers, DTOs
  config/         → centralized NestJS config

apps/web/src/     → Next.js pages and components (no business logic)

specs/            → SpecKit feature specifications
.specify/         → SpecKit config, templates, constitution
.claude/skills/   → Claude Code slash skills
```

## Common Commands

```powershell
pnpm dev                   # Start all apps
pnpm lint                  # Lint all packages
pnpm typecheck             # TypeScript check
pnpm build                 # Build all packages
pnpm --filter @leaseKo/api test   # Run API tests
pnpm db:up                 # Start Docker DB/Redis
pnpm db:migrate            # Run Prisma migrations
pnpm speckit:status        # Check SpecKit integration status
```
