# Quickstart: Clean Architecture Module Structure

**Feature**: 016-clean-arch-module-structure
**Date**: 2026-05-05

---

## What This Feature Does

Standardizes the NestJS backend into a consistent four-layer Clean Architecture structure across all modules. Two files are moved; scaffold directories are created in every module to make the template visible and navigable.

**Before**: Some modules had controllers at the module root; `domain/` directories were absent.
**After**: Every module has `domain/`, `application/`, `infrastructure/`, `presentation/` subdirectories.

---

## Changes Summary

### Files Moved (2)

| From | To |
|---|---|
| `modules/health/health.controller.ts` | `modules/health/presentation/health.controller.ts` |
| `modules/system/system.controller.ts` | `modules/system/presentation/system.controller.ts` |

### Files Updated (3)

| File | Change |
|---|---|
| `modules/health/health.module.ts` | Controller import path updated |
| `modules/health/health.controller.spec.ts` | Controller import path updated |
| `modules/system/system.module.ts` | Controller import path updated |

### Directories Created (16 scaffold dirs)

All empty — contain only `.gitkeep` files. Created in: `auth`, `tenants`, `users`, `tenant-context`, `health`, `system` modules.

### New Documentation File

`docs/backend-architecture.md` — canonical architecture reference for the team.

---

## Running the Implementation

### Prerequisites

```powershell
# Ensure you are on the correct branch
git branch --show-current
# → 016-clean-arch-module-structure

# Ensure current state is clean
pnpm --filter @leaseKo/api typecheck
pnpm --filter @leaseKo/api test
```

### Phase 1: Scaffold directories

```powershell
cd "c:\Users\Zared\Projects\LeaseKo\apps\api\src\modules"

# auth
New-Item -ItemType File -Force "auth/domain/.gitkeep"
New-Item -ItemType File -Force "auth/presentation/dto/.gitkeep"

# tenants
New-Item -ItemType File -Force "tenants/domain/entities/.gitkeep"
New-Item -ItemType File -Force "tenants/application/use-cases/.gitkeep"
New-Item -ItemType File -Force "tenants/presentation/dto/.gitkeep"

# users
New-Item -ItemType File -Force "users/domain/.gitkeep"
New-Item -ItemType File -Force "users/presentation/dto/.gitkeep"

# tenant-context
New-Item -ItemType File -Force "tenant-context/domain/.gitkeep"
New-Item -ItemType File -Force "tenant-context/application/.gitkeep"
New-Item -ItemType File -Force "tenant-context/infrastructure/.gitkeep"

# health
New-Item -ItemType File -Force "health/domain/.gitkeep"
New-Item -ItemType File -Force "health/application/.gitkeep"
New-Item -ItemType File -Force "health/infrastructure/.gitkeep"

# system
New-Item -ItemType File -Force "system/domain/.gitkeep"
New-Item -ItemType File -Force "system/application/.gitkeep"
New-Item -ItemType File -Force "system/infrastructure/.gitkeep"
```

### Phase 2: Move `health.controller.ts`

```powershell
# From apps/api/src/modules/health/
Move-Item "health.controller.ts" "presentation/health.controller.ts"
```

Then update imports in:
- `health.controller.ts` (after move): `../../common/...` → `../../../common/...` and `./presentation/dto/...` → `./dto/...`
- `health.module.ts`: `./health.controller` → `./presentation/health.controller`
- `health.controller.spec.ts`: `./health.controller` → `./presentation/health.controller`

Verify:
```powershell
pnpm --filter @leaseKo/api typecheck
```

### Phase 3: Move `system.controller.ts`

```powershell
# From apps/api/src/modules/system/
Move-Item "system.controller.ts" "presentation/system.controller.ts"
```

Then update imports in:
- `system.controller.ts` (after move): `../../common/...` → `../../../common/...`, `../../shared/...` → `../../../shared/...`, `./presentation/dto/...` → `./dto/...`
- `system.module.ts`: `./system.controller` → `./presentation/system.controller`

Verify:
```powershell
pnpm --filter @leaseKo/api typecheck
```

### Phase 4: Create `docs/backend-architecture.md`

Create the architecture documentation file at `c:\Users\Zared\Projects\LeaseKo\docs\backend-architecture.md`.

### Phase 5: Final validation

```powershell
cd "c:\Users\Zared\Projects\LeaseKo"
pnpm --filter @leaseKo/api typecheck
pnpm --filter @leaseKo/api build
pnpm --filter @leaseKo/api test

# Prisma isolation check
$violations = Get-ChildItem -Path "apps/api/src" -Recurse -Filter "*.ts" |
  Select-String -Pattern "^import.*PrismaService|^import.*@prisma/client" |
  Where-Object { $_.Path -notmatch "database[/\\]prisma" -and $_.Path -notmatch "infrastructure[/\\]repositories" }
if ($violations) { $violations } else { Write-Host "PASS: Zero violations" }
```

---

## Adding a New Module (Future Reference)

After this feature is complete, all new modules must follow this template:

```
modules/example/
├── domain/
│   ├── entities/
│   │   └── example.entity.ts
│   └── errors/
│       └── example-not-found.error.ts
├── application/
│   ├── repositories/
│   │   └── example.repository.ts        ← interface + DI token
│   └── use-cases/
│       └── get-example.use-case.ts
├── infrastructure/
│   └── repositories/
│       └── prisma-example.repository.ts  ← PrismaService here only
├── presentation/
│   ├── dto/
│   │   └── example-response.dto.ts
│   └── example.controller.ts
└── example.module.ts
```

For full documentation see: `docs/backend-architecture.md`

---

## Verification Commands

```powershell
# Typecheck
pnpm --filter @leaseKo/api typecheck

# Build
pnpm --filter @leaseKo/api build

# Tests
pnpm --filter @leaseKo/api test

# Confirm layer dirs in every module (PowerShell)
Get-ChildItem "apps/api/src/modules" -Directory | ForEach-Object {
  $m = $_.Name
  $layers = @("domain","application","infrastructure","presentation")
  $layers | ForEach-Object {
    $exists = Test-Path "apps/api/src/modules/$m/$_"
    Write-Host "$m/$_ : $(if ($exists) {'✓'} else {'MISSING'})"
  }
}
```
