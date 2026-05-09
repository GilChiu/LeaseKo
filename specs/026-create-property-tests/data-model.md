# Data Model: CreateProperty Use Case Unit Tests

**Feature**: 026-create-property-tests
**Phase**: 1 — Design
**Date**: 2026-05-09

---

## Overview

This document describes the test design — the test file structure, mock shape, test cases, and assertions. No new production types or entities are introduced.

---

## Reused Production Files (no changes)

- `CreatePropertyUseCase` — `apps/api/src/modules/properties/application/use-cases/create-property.use-case.ts`
- `PropertyRepository` (interface) — `apps/api/src/modules/properties/application/repositories/property.repository.ts`
- `CreatePropertyInput` — `apps/api/src/modules/properties/application/types/property-repository.types.ts`
- `Property` (domain entity) — `apps/api/src/modules/properties/domain/entities/property.entity.ts`

---

## Test File: `create-property.use-case.spec.ts`

**Full path**: `apps/api/src/modules/properties/application/use-cases/create-property.use-case.spec.ts`

```typescript
import { CreatePropertyUseCase } from "./create-property.use-case";
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from "../repositories/property.repository";
import { CreatePropertyInput } from "../types/property-repository.types";
import { Property } from "../../domain/entities/property.entity";

void PROPERTY_REPOSITORY; // imported for documentation; not used at runtime

describe("CreatePropertyUseCase", () => {
  const mockCreatedAt = new Date("2026-05-09T12:00:00.000Z");
  const mockUpdatedAt = new Date("2026-05-09T12:00:00.000Z");

  const mockInput: CreatePropertyInput = {
    tenantId: "tenant_test_123",
    name: "Sample Apartment Building",
    addressLine1: "123 Main Street",
    addressLine2: "Unit A",
    city: "Iloilo City",
    state: "Iloilo",
    postalCode: "5000",
    country: "Philippines",
    propertyType: "APARTMENT",
    description: "A sample rental property",
  };

  const mockProperty: Property = {
    id: "property_test_123",
    tenantId: "tenant_test_123",
    name: "Sample Apartment Building",
    addressLine1: "123 Main Street",
    addressLine2: "Unit A",
    city: "Iloilo City",
    state: "Iloilo",
    postalCode: "5000",
    country: "Philippines",
    propertyType: "APARTMENT",
    description: "A sample rental property",
    createdAt: mockCreatedAt,
    updatedAt: mockUpdatedAt,
    deletedAt: null,
  };

  const mockRepo: PropertyRepository = {
    create: jest.fn(),
    findManyByTenant: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  let useCase: CreatePropertyUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreatePropertyUseCase(mockRepo);
  });

  describe("execute", () => {
    it("returns the Property created by the repository", async () => { ... });
    it("calls repository.create exactly once", async () => { ... });
    it("passes the full input to repository.create", async () => { ... });
    it("forwards tenantId from input to repository.create", async () => { ... });
    it("does not call any other repository method", async () => { ... });
    it("propagates repository errors without swallowing them", async () => { ... });
    it("propagates the exact error thrown by the repository", async () => { ... });
  });
});
```

---

## Test Case Matrix

| ID | Description | Mock Behavior | Assertion |
|---|---|---|---|
| TC-1 | Successful create returns Property | `create` resolves `mockProperty` | `result` deep-equals `mockProperty` |
| TC-2 | `repository.create` called exactly once | `create` resolves `mockProperty` | `toHaveBeenCalledTimes(1)` |
| TC-3 | Full input passed to `repository.create` | `create` resolves `mockProperty` | `toHaveBeenCalledWith(mockInput)` |
| TC-4 | `tenantId` forwarded | `create` resolves `mockProperty` | `toHaveBeenCalledWith(objectContaining({ tenantId: "tenant_test_123" }))` |
| TC-5 | No other repository method called | `create` resolves `mockProperty` | `findManyByTenant/findById/update/softDelete` not called |
| TC-6 | Error propagated (message) | `create` rejects with `new Error("Repository failure")` | `.rejects.toThrow("Repository failure")` |
| TC-7 | Exact error object propagated | `create` rejects with `repositoryError` | `.rejects.toBe(repositoryError)` |

---

## Mock Strategy

```
PropertyRepository (mocked)
  create: jest.fn()             ← only mock that needs .mockResolvedValueOnce
  findManyByTenant: jest.fn()   ← used in TC-5 "not called" assertion
  findById: jest.fn()           ← used in TC-5 "not called" assertion
  update: jest.fn()             ← used in TC-5 "not called" assertion
  softDelete: jest.fn()         ← used in TC-5 "not called" assertion
```

`jest.clearAllMocks()` in `beforeEach` resets call counts and return values between tests.

---

## Instantiation Strategy

```
useCase = new CreatePropertyUseCase(mockRepo)
```

The `@Inject(PROPERTY_REPOSITORY)` decorator is a NestJS metadata annotation — it has no runtime effect when the class is instantiated directly in a test. The constructor receives `mockRepo` as the first argument, satisfying the `PropertyRepository` parameter type.

---

## Architecture Boundary Summary

```
Test file imports:
  ✅ CreatePropertyUseCase    — application layer (under test)
  ✅ PropertyRepository       — application layer interface (mocked)
  ✅ CreatePropertyInput      — application layer type
  ✅ Property                 — domain layer interface

Test file DOES NOT import:
  ❌ PrismaService
  ❌ @prisma/client
  ❌ PrismaPropertyRepository
  ❌ PropertiesController
  ❌ CreatePropertyDto
  ❌ PropertyResponseDto
  ❌ ClerkJwtGuard
  ❌ AppModule
```
