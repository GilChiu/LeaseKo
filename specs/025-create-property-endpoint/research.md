# Research: Create Property Use Case & API Endpoint

**Phase**: 0 — Pre-design research
**Feature**: 025-create-property-endpoint
**Date**: 2026-05-09

---

## Decision 1: Use Case Input Shape — Command Object vs Flat Parameters

**Decision**: Single input object `CreatePropertyInput` passed to `execute()` — reuse the existing `CreatePropertyInput` interface from `property-repository.types.ts`

**Rationale**: `GetCurrentUserUseCase.execute(clerkUserId)` passes a flat string. For a richer input with many fields, a single typed object is cleaner. The `CreatePropertyInput` type already exists in the application layer — reusing it avoids duplication and keeps the use case's input contract aligned with the repository's.

**Alternative considered**: Define a separate `CreatePropertyCommand` type in the use case file — rejected as unnecessary duplication when the existing type already matches exactly.

---

## Decision 2: Use Case Return Type — `Property` Domain Entity or Application DTO

**Decision**: Return the `Property` domain entity directly from the use case

**Rationale**: `GetCurrentUserUseCase` returns `UserRecord | null` (application-layer type). For `CreatePropertyUseCase`, returning the `Property` domain entity is appropriate — the controller will map it to `PropertyResponseDto` in the presentation layer. This keeps use-case output clean and lets the controller own the HTTP-layer shape.

---

## Decision 3: `@RequiresTenant()` Guard Behavior

**Decision**: Use `@RequiresTenant()` on the controller method — this is the established pattern

**Rationale**: `TenantContextController.getTenantContext()` uses `@RequiresTenant()` on the method. The decorator sets metadata that the `ClerkJwtGuard` (as `APP_GUARD`) reads to enforce that `tenantId` is present in the request context. If `tenantId` is null/missing, the guard returns 403. This behavior is already implemented and tested.

**Controller approach**: The controller receives `@CurrentTenant() tenantId: string` — NestJS injects the value from `request.user.tenantId`. If `tenantId` is null (guard missed it), the use case will receive null which `tenantFilter()` will throw on — defense in depth.

---

## Decision 4: `tenantId` in `PropertyResponseDto` — Include or Exclude

**Decision**: Include `tenantId` in `PropertyResponseDto`

**Rationale**: Spec assumption: "Include tenantId for API transparency — consistent with how existing APIs expose tenant context." The `TenantContextController` endpoint returns `{ tenantId }` directly. Including `tenantId` in the property response lets API consumers confirm the property belongs to their tenant context without a separate call.

---

## Decision 5: `propertyType` — String vs Enum

**Decision**: `string` in DTO — no enum validation at this stage

**Rationale**: The Prisma model stores `propertyType` as `String`. No enum is defined in the schema. Adding an enum now would constrain future extensibility and is inconsistent with the schema. The spec notes: "enum validation is a future enhancement." A future migration can add a Prisma enum and update the DTO simultaneously.

---

## Decision 6: Controller File Location

**Decision**: `apps/api/src/modules/properties/presentation/properties.controller.ts`

**Rationale**: Clean Architecture requires the presentation layer at `presentation/`. No `users.controller.ts` exists in the users module (the `GetCurrentUserUseCase` has not been exposed via controller yet). The `TenantContextController` at `tenant-context/presentation/` is the direct pattern to follow.

---

## Decision 7: `forbidNonWhitelisted: true` — Effect on Extra Body Fields

**Decision**: No action needed — global `ValidationPipe` already configured with `whitelist: true, forbidNonWhitelisted: true`

**Rationale**: `main.ts` sets `forbidNonWhitelisted: true`. If a client sends `tenantId` in the request body, NestJS will return a 400 error (`property tenantId should not exist`). This is stronger than `whitelist: true` alone (which would silently strip). This means `CreatePropertyDto` must contain exactly the fields that clients are expected to send — no extra fields.

**Note**: This means `@IsOptional()` fields in the DTO must still be listed in the DTO class; they just don't need to be present in every request.

---

## Decision 8: `@ApiCreatedResponse` Type — Class Reference vs Schema

**Decision**: Use `type: PropertyResponseDto` directly in `@ApiCreatedResponse`

**Rationale**: `PropertyResponseDto` will use `@ApiProperty` decorators on each field. NestJS Swagger plugin can pick up class-level decorator metadata. Using `type: PropertyResponseDto` gives Swagger a fully typed schema without manual schema definition. Same pattern as `type: ErrorResponseDto` used in existing controllers.

---

## Decision 9: Module Registration — `PropertiesController` in `PropertiesModule`

**Decision**: Add `PropertiesController` to `controllers` array in `PropertiesModule` — no `AppModule` change needed (already imported)

**Rationale**: `AppModule` already imports `PropertiesModule` (added in Feature 024). Adding `controllers: [PropertiesController]` to `PropertiesModule` is sufficient. NestJS auto-discovers controllers within imported modules.

---

## Summary of Resolved Decisions

| Topic | Decision |
|---|---|
| Use case input | Reuse `CreatePropertyInput` from `property-repository.types.ts` |
| Use case return | `Property` domain entity |
| Tenant guard | `@RequiresTenant()` on controller method |
| `tenantId` in response | Include — API transparency |
| `propertyType` type | `string` — no enum at this stage |
| Controller location | `presentation/properties.controller.ts` |
| `forbidNonWhitelisted` | Already enforced globally — no extra body fields allowed |
| Swagger response type | `type: PropertyResponseDto` |
| Module wiring | `controllers: [PropertiesController]` in `PropertiesModule` |

All NEEDS CLARIFICATION items resolved. Ready for Phase 1 design.
