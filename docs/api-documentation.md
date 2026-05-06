# API Documentation Reference

This document is the developer reference for the LeaseKo API's Swagger/OpenAPI
documentation. It covers how to access the documentation UI, how to authorize, and
the exact patterns to follow when documenting a new endpoint.

---

## Accessing the Swagger UI

The interactive API documentation is only available in non-production environments.

| Environment | URL |
|---|---|
| Local development | `http://localhost:3001/api/docs` |
| Production | Not served (returns 404) |

The port is controlled by the `PORT` environment variable in `apps/api/.env` (default: `3001`).

**OpenAPI JSON** (machine-readable spec):

```
http://localhost:3001/api/docs-json
```

---

## Bearer JWT Authorization

1. Obtain a valid Clerk-issued JWT (from the frontend session cookie or Clerk dashboard → **Testing tokens**).
2. Open `http://localhost:3001/api/docs`.
3. Click the **Authorize** button (lock icon, top-right).
4. In the **BearerAuth** field, paste the JWT value — do **not** include the `Bearer ` prefix; the UI adds it automatically.
5. Click **Authorize** → **Close**.
6. All subsequent requests from the UI will send `Authorization: Bearer <token>`.

> The token is stored only in your browser session. It is not persisted anywhere and is cleared on page reload.

---

## Current Endpoints

| Endpoint | Tag | Auth Required | Description |
|---|---|---|---|
| `GET /health` | System | None (public) | API liveness check |
| `GET /me` | System | Bearer JWT | Authenticated user context (userId + tenantId) |
| `GET /auth/me` | auth | Bearer JWT | Auth module user context |
| `GET /tenant-context` | tenant-context | Bearer JWT + active org | Active tenant context (tenantId) |

---

## Endpoint Documentation Patterns

Follow one of the three patterns below based on the endpoint's auth requirement.

### Pattern A — Public Endpoint (no auth required)

```typescript
import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../../common/decorators/public.decorator";
import { MyResponseDto } from "./dto/my-response.dto";

@ApiTags("my-module")
@Controller("my-module")
export class MyController {
  @Get("status")
  @Public()
  @ApiOperation({
    summary: "Short one-line description",
    description: "Longer description if needed. Public — no authentication required.",
  })
  @ApiOkResponse({ type: MyResponseDto, description: "Success response description" })
  status(): MyResponseDto {
    // ...
  }
}
```

### Pattern B — User-Protected Endpoint (Bearer JWT required)

```typescript
import { Controller, Get } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { UserOnly } from "../../../common/decorators/user-only.decorator";
import { ErrorResponseDto } from "../../../shared/dto/error-response.dto";
import { MyResponseDto } from "./dto/my-response.dto";

@ApiTags("my-module")
@ApiBearerAuth()
@Controller("my-module")
export class MyController {
  @Get("me")
  @UserOnly()
  @ApiOperation({ summary: "Short one-line description" })
  @ApiOkResponse({ type: MyResponseDto, description: "Success response description" })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: "Missing or invalid Bearer token.",
  })
  getMe(): MyResponseDto {
    // ...
  }
}
```

### Pattern C — Tenant-Protected Endpoint (Bearer JWT + active organization required)

```typescript
import { Controller, Get } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { RequiresTenant } from "../../../common/decorators/requires-tenant.decorator";
import { ErrorResponseDto } from "../../../shared/dto/error-response.dto";
import { MyResponseDto } from "./dto/my-response.dto";

@ApiTags("my-module")
@ApiBearerAuth()
@Controller("my-module")
export class MyController {
  @Get()
  @RequiresTenant()
  @ApiOperation({ summary: "Short one-line description" })
  @ApiOkResponse({ type: MyResponseDto, description: "Success response description" })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: "Missing or invalid Bearer token.",
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: "Authenticated but no active organization context.",
  })
  getResource(): MyResponseDto {
    // ...
  }
}
```

---

## Response DTO Pattern

Place response DTOs in `modules/<module-name>/presentation/dto/`.

```typescript
// modules/my-module/presentation/dto/my-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MyResponseDto {
  @ApiProperty({
    example: "val_abc123",
    description: "Human-readable description of this field",
  })
  id!: string;

  @ApiProperty({
    example: "My resource name",
    description: "Display name",
  })
  name!: string;

  @ApiPropertyOptional({
    example: "optional value",
    description: "This field may be absent",
  })
  optionalField?: string;
}
```

Rules:
- Always include `example` values — they appear in the Swagger UI and OpenAPI JSON.
- Use `@ApiProperty` for required fields, `@ApiPropertyOptional` for optional ones.
- Do not include business logic in DTOs.
- Do not expose raw Clerk JWT claims, tokens, or database IDs directly.

---

## Error Response Pattern

Always reference `ErrorResponseDto` by type — never duplicate the schema inline.

```typescript
import { ErrorResponseDto } from "../../../shared/dto/error-response.dto";

// 401
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: "Missing or invalid Bearer token.",
})

// 403
@ApiForbiddenResponse({
  type: ErrorResponseDto,
  description: "Authenticated but no active organization context.",
})

// 400 (add to POST/PATCH endpoints with validation)
@ApiBadRequestResponse({
  type: ErrorResponseDto,
  description: "Request body failed validation. See error.details.fields.",
})
```

The standard error shape (`{ success: false, error: { code, message, statusCode, timestamp, path, details? } }`) is defined once in `apps/api/src/shared/dto/error-response.dto.ts` and referenced everywhere.

For the full error code reference, see [api-errors.md](./api-errors.md).

---

## Clean Architecture Placement Rules

Swagger decorators belong exclusively to the **presentation layer**.

| Location | Swagger decorators allowed? |
|---|---|
| `modules/*/presentation/` (controllers, DTOs) | ✅ Yes |
| `apps/api/src/main.ts` | ✅ Yes (bootstrap only) |
| `modules/*/domain/` | ❌ No |
| `modules/*/application/use-cases/` | ❌ No |
| `modules/*/infrastructure/repositories/` | ❌ No |
| `common/` (guards, filters, middleware) | ❌ No |

Violating this rule couples the domain/application layers to the HTTP documentation framework, which breaks the Clean Architecture guarantee.
