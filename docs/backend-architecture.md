# Backend Architecture: LeaseKo API

**Location**: `apps/api/src/`
**Updated**: 2026-05-05
**Feature**: 016-clean-arch-module-structure

This document is the canonical reference for backend module structure, layer responsibilities, dependency rules, and the template for adding new modules. Every new developer and every code review should be able to cite a specific rule from this document.

---

## Module Structure Overview

The backend is organized as a Modular Monolith. Each business capability lives in its own module inside `apps/api/src/modules/`. Every module follows the same four-layer folder structure.

```text
apps/api/src/
├── modules/                  ← Business capability modules
│   ├── auth/
│   ├── tenants/
│   ├── users/
│   ├── tenant-context/
│   ├── health/
│   └── system/
│
├── common/                   ← Cross-cutting shared infrastructure
│   ├── config/               ← App configuration (AppConfig, validation schema)
│   ├── decorators/           ← @CurrentUser(), @CurrentTenant(), @Public(), etc.
│   ├── filters/              ← GlobalExceptionFilter
│   ├── guards/               ← ClerkJwtGuard (registered as APP_GUARD in AuthModule)
│   ├── interceptors/         ← Future: logging, response-transform interceptors
│   ├── middleware/           ← Future: request-scoped middleware
│   ├── pipes/                ← Future: custom validation pipes
│   ├── repositories/         ← ITenantScopedRepository<T> base interface
│   ├── types/                ← IRequestContext
│   └── utils/                ← tenantFilter(), other shared utilities
│
├── shared/                   ← Shared DTO types used across modules
│   └── dto/                  ← ErrorResponseDto
│
├── database/
│   └── prisma/               ← PrismaService, DatabaseModule (@Global)
│
└── queues/
    └── bullmq/               ← QueuesModule (BullMQ integration)
```

---

## Four-Layer Module Structure

Every business module uses exactly four layers:

```text
modules/{module-name}/
├── domain/                   ← Core business concepts (no external dependencies)
│   ├── entities/
│   └── errors/
├── application/              ← Use cases and interfaces (no Prisma, no HTTP)
│   ├── repositories/         ← Repository interfaces + DI tokens
│   └── use-cases/            ← Use case classes
├── infrastructure/           ← External system implementations
│   └── repositories/         ← Prisma repository implementations
├── presentation/             ← HTTP-facing code
│   ├── dto/                  ← Request/response DTOs with Swagger decorators
│   └── {module}.controller.ts
└── {module}.module.ts        ← NestJS DI wiring
```

---

## Layer Responsibility Table

| Layer | Folder | Responsibility | Forbidden |
|---|---|---|---|
| **Domain** | `domain/` | Entities, value objects, domain rules, domain errors, domain constants | NestJS decorators, `@prisma/client`, `PrismaService`, HTTP objects, external SDKs |
| **Application** | `application/` | Use cases, repository interfaces, DI tokens, application types, orchestration | `PrismaService`, `@prisma/client`, `@Get`/`@Post` controller decorators, `Request`/`Response` HTTP types |
| **Infrastructure** | `infrastructure/` | Prisma repositories, Clerk adapter, Redis/BullMQ adapters, external API clients | Controller decorators, direct DTO HTTP decorators |
| **Presentation** | `presentation/` | Controllers, DTOs, Swagger decorators, route-level validation | `PrismaService`, direct repository classes, business logic |

### Quick layer placement rules

- **"Does this define a business concept?"** → `domain/`
- **"Does this describe what data is needed (interface) or what work to do (use case)?"** → `application/`
- **"Does this talk to a database, external API, or SDK?"** → `infrastructure/`
- **"Does this handle HTTP requests or format HTTP responses?"** → `presentation/`
- **"Is this used by more than one module and has no domain-specific logic?"** → `common/`

---

## Dependency Direction

```
presentation  ──►  application  ──►  domain
infrastructure              ──►  application / domain
```

### Allowed imports

| From | May import | Example |
|---|---|---|
| `presentation/` | `application/` use cases and types | `GetCurrentUserUseCase`, `UserRecord` |
| `presentation/` | `domain/` types if needed for DTO mapping | `TenantRole` value object |
| `application/` | `domain/` entities and value objects | `Tenant`, `TenantRole` |
| `infrastructure/` | `application/` repository interfaces | `UserRepository`, `USER_REPOSITORY` |
| `infrastructure/` | `domain/` entities for persistence mapping | `User` entity |
| `common/` | Nothing domain-specific | Only generic TypeScript |

### Forbidden imports

| From | Must NOT import | Reason |
|---|---|---|
| `domain/` | Anything from other layers | Domain must be dependency-free |
| `application/` | `infrastructure/` implementation classes | Prevents direct coupling to Prisma |
| `presentation/` | `infrastructure/` implementation classes | No Prisma in controllers |
| `presentation/` | `PrismaService` | No Prisma in controllers |
| Any module | Another module's `infrastructure/` | Cross-module infra coupling |

---

## Prisma Usage Rules

`PrismaService` and `@prisma/client` are ONLY allowed in two locations:

| Location | Allowed? | Notes |
|---|---|---|
| `database/prisma/prisma.service.ts` | ✅ | Definition only. `@Global()` makes it available everywhere via DI. |
| `modules/*/infrastructure/repositories/prisma-*.ts` | ✅ | Only location that may inject `PrismaService` for a given aggregate. |
| `modules/*/application/` | ❌ FORBIDDEN | Use cases program against repository interfaces only. |
| `modules/*/domain/` | ❌ FORBIDDEN | Domain entities must have no persistence dependencies. |
| `modules/*/presentation/` | ❌ FORBIDDEN | Controllers must not touch Prisma. |
| `common/` | ❌ FORBIDDEN | Cross-cutting code must not depend on Prisma. |
| `shared/` | ❌ FORBIDDEN | Shared DTOs must not import Prisma. |

**Verification command:**
```powershell
$violations = Get-ChildItem -Path "apps/api/src" -Recurse -Filter "*.ts" |
  Select-String -Pattern "^import.*PrismaService|^import.*@prisma/client" |
  Where-Object { $_.Path -notmatch "database[/\\]prisma" -and $_.Path -notmatch "infrastructure[/\\]repositories" }
if ($violations) { $violations } else { Write-Host "PASS: Zero violations" }
```

---

## Repository Boundary Rules

| Rule | Detail |
|---|---|
| Interfaces in `application/repositories/` | One file per aggregate: contains the Symbol DI token, input types, output types, and the interface |
| DI token co-located with interface | `export const USER_REPOSITORY = Symbol("USER_REPOSITORY")` — defined in same file as `UserRepository` |
| Implementations in `infrastructure/repositories/` | One class per aggregate: `prisma-{name}.repository.ts` |
| Module binds token to class | `{ provide: USER_REPOSITORY, useClass: PrismaUserRepository }` in `{module}.module.ts` |
| Use cases inject via token | `@Inject(USER_REPOSITORY) private readonly users: UserRepository` |
| Controllers call use cases | Controllers never inject repository tokens directly |
| Output types are application types | Repository returns `UserRecord` (defined in interface file) — never raw Prisma types |

### Error normalization in Prisma repositories

| Prisma Error | Normalized Response |
|---|---|
| `P2025` (record not found on update/delete) | Return `null` |
| `P2002` (unique constraint violation) | Throw `Error` with descriptive message |
| All others | Re-throw unchanged |

---

## Module Boundary Rules

| Rule | Detail |
|---|---|
| A module owns its data | No other module imports a module's `infrastructure/` layer |
| Export only application-layer items | `{module}.module.ts` exports use cases or DI tokens — never repository implementations |
| Cross-module via NestJS imports | `AuthModule` exports `VerifyClerkTokenUseCase`; other modules add `AuthModule` to their `imports` array |
| No circular dependencies | Module A imports Module B implies Module B does not import Module A |
| `common/` is not a module | It is shared infrastructure — it does not have a `*.module.ts` or its own DI registration |

---

## Common Folder Rules

`common/` is for **truly shared, cross-cutting infrastructure only**. It must not become a dumping ground.

| Folder | Contents | Example files |
|---|---|---|
| `common/config/` | App-wide configuration types and validation | `app.config.ts`, `validation.schema.ts` |
| `common/decorators/` | Parameter decorators and metadata decorators | `@CurrentUser()`, `@Public()`, `@RequiresTenant()` |
| `common/filters/` | Global exception filters | `global-exception.filter.ts` |
| `common/guards/` | Guards registered globally (via APP_GUARD) | `clerk-jwt.guard.ts` |
| `common/interceptors/` | Logging, response-transform interceptors | Future: `logging.interceptor.ts` |
| `common/middleware/` | Request-scoped middleware | Future: `request-id.middleware.ts` |
| `common/pipes/` | Custom validation pipes | Future: `parse-uuid.pipe.ts` |
| `common/repositories/` | Cross-cutting repository base interfaces | `ITenantScopedRepository<T>` |
| `common/types/` | Shared TypeScript types | `IRequestContext` |
| `common/utils/` | Pure utility functions | `tenantFilter()` |

**Forbidden in `common/`:**
- Domain entities or value objects for a specific module (e.g., `Tenant`, `Property`)
- Business rules that belong to a specific bounded context
- Direct Prisma imports

---

## Current Module Status

| Module | Domain | Application | Infrastructure | Presentation |
|---|---|---|---|---|
| `auth` | ✓ (scaffold) | `verify-clerk-token.use-case.ts` | `clerk-token-verifier.service.ts` | `auth.controller.ts` |
| `tenants` | ✓ (scaffold) | `tenant.repository.ts`, `tenant-membership.repository.ts` | `prisma-tenant.repository.ts`, `prisma-tenant-membership.repository.ts` | ✓ (scaffold) |
| `users` | ✓ (scaffold) | `user.repository.ts`, `get-current-user.use-case.ts` | `prisma-user.repository.ts` | ✓ (scaffold) |
| `tenant-context` | ✓ (scaffold) | ✓ (scaffold) | ✓ (scaffold) | `tenant-context.controller.ts` |
| `health` | ✓ (scaffold) | ✓ (scaffold) | ✓ (scaffold) | `health.controller.ts`, `health-response.dto.ts` |
| `system` | ✓ (scaffold) | ✓ (scaffold) | ✓ (scaffold) | `system.controller.ts`, `me-response.dto.ts` |

---

## Future Module Template

When adding a new business module (e.g., `properties`), follow this exact structure:

```text
modules/properties/
├── domain/
│   ├── entities/
│   │   └── property.entity.ts          ← Plain TypeScript class, no external imports
│   └── errors/
│       └── property-not-found.error.ts ← extends Error, no external imports
├── application/
│   ├── repositories/
│   │   └── property.repository.ts      ← Symbol token + input/output types + interface
│   └── use-cases/
│       ├── list-properties.use-case.ts
│       ├── get-property.use-case.ts
│       └── create-property.use-case.ts
├── infrastructure/
│   └── repositories/
│       └── prisma-property.repository.ts  ← PrismaService injected HERE only
├── presentation/
│   ├── dto/
│   │   ├── create-property.dto.ts      ← class-validator decorators + @ApiProperty
│   │   └── property-response.dto.ts
│   └── properties.controller.ts        ← Thin: calls use cases, returns DTOs
└── properties.module.ts                ← Binds PROPERTY_REPOSITORY → PrismaPropertyRepository
```

### Application repository template

```typescript
// application/repositories/property.repository.ts
import { ITenantScopedRepository } from "../../../../common/repositories/tenant-scoped.repository.interface";

export const PROPERTY_REPOSITORY = Symbol("PROPERTY_REPOSITORY");

export interface PropertyRecord {
  id: string;
  tenantId: string;  // ← REQUIRED on all business models
  name: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePropertyInput {
  name: string;
  address: string;
}

export interface PropertyRepository extends ITenantScopedRepository<PropertyRecord> {
  // domain-specific methods beyond standard CRUD
  findByName(tenantId: string, name: string): Promise<PropertyRecord | null>;
}
```

### Module wiring template

```typescript
// properties.module.ts
import { Module } from "@nestjs/common";
import { PROPERTY_REPOSITORY } from "./application/repositories/property.repository";
import { PrismaPropertyRepository } from "./infrastructure/repositories/prisma-property.repository";
import { ListPropertiesUseCase } from "./application/use-cases/list-properties.use-case";
import { PropertiesController } from "./presentation/properties.controller";

@Module({
  providers: [
    { provide: PROPERTY_REPOSITORY, useClass: PrismaPropertyRepository },
    ListPropertiesUseCase,
  ],
  controllers: [PropertiesController],
  exports: [ListPropertiesUseCase],
})
export class PropertiesModule {}
```

### Controller template

```typescript
// presentation/properties.controller.ts
@ApiTags("properties")
@ApiBearerAuth()
@Controller("properties")
export class PropertiesController {
  constructor(private readonly listProperties: ListPropertiesUseCase) {}

  @Get()
  @RequiresTenant()
  list(@CurrentTenant() tenantId: string): Promise<PropertyRecord[]> {
    return this.listProperties.execute(tenantId);
  }
}
```

---

## Refactor Checklist

Use this when moving existing code into the correct layer structure:

- [ ] Identify current file location and target layer
- [ ] Create target directory if it does not exist
- [ ] Copy file to new location
- [ ] Update all internal imports (adjust relative path depth)
- [ ] Update all files that import the moved file
- [ ] Delete the original file
- [ ] Run `pnpm --filter @leaseKo/api typecheck` — must exit 0
- [ ] Run `pnpm --filter @leaseKo/api test` — all suites must pass

---

## Validation Checklist

Run before marking any feature complete:

- [ ] Each module has `domain/`, `application/`, `infrastructure/`, `presentation/` directories
- [ ] Zero `PrismaService` or `@prisma/client` imports outside `database/prisma/` and `*/infrastructure/repositories/`
- [ ] Controllers contain no business logic — only use case calls and DTO mapping
- [ ] Repository interfaces have no `@prisma/client` imports
- [ ] Use cases inject repository interfaces (via token), not concrete classes
- [ ] `pnpm --filter @leaseKo/api typecheck` exits 0
- [ ] `pnpm --filter @leaseKo/api build` exits 0
- [ ] `pnpm --filter @leaseKo/api test` — all suites pass

---

## Next Features

| Feature | Description |
|---|---|
| **017** | Config management — typed `ConfigService` injection across all modules |
| **018** | Global exception filter — unit tests + domain-error-to-HTTP mapping |
| **019** | Swagger documentation coverage — 100% endpoint `@ApiOperation` + DTO `@ApiProperty` |
| **020** | Testing foundation — Jest unit/integration/e2e separation strategy |
| **021** | User/Tenant sync use cases — `SyncUserFromClerkUseCase`, `SyncTenantFromClerkUseCase` |
| **022** | Properties module — first business module following this template |

---

*See also: [docs/tenant-isolation.md](tenant-isolation.md), [docs/data-layer.md](data-layer.md)*
