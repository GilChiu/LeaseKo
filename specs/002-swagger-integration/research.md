# Research: Swagger (OpenAPI) Integration

**Feature**: `002-swagger-integration`
**Date**: 2026-05-02
**Status**: Complete — all decisions resolved

---

## 1. Package Setup and Bootstrap Pattern

**Decision**: Use `@nestjs/swagger` only — no separate `swagger-ui-express` installation. Initialize with `DocumentBuilder` → `SwaggerModule.createDocument()` → `SwaggerModule.setup()` in `main.ts`. Wrap `setup()` in a `NODE_ENV !== 'production'` guard.

**Rationale**: `@nestjs/swagger` bundles `swagger-ui-express` internally for Express-based NestJS apps. No additional packages are needed. The `DocumentBuilder` factory pattern defers document generation to startup. Conditional disable prevents API surface exposure in production — this is an application-level control complementing any infrastructure-level restriction.

**Key configuration**:

- API path: `api/docs` (Swagger UI), `api/docs-json` (OpenAPI JSON)
- `ignoreGlobalPrefix: true` in `createDocument()` options — prevents double-prefixing with the global `/api/v1` prefix set in `main.ts`
- `useGlobalPrefix: false` in `setup()` options (default) — spec reflects actual callable routes, not internal prefixes

**Alternatives considered**:

- Manual `swagger-ui-express` registration: unnecessary boilerplate; `@nestjs/swagger` covers it.
- Always expose Swagger, restrict with auth middleware: violates least-privilege; should be disabled, not hidden.

---

## 2. Bearer JWT Security Scheme

**Decision**: Call `.addBearerAuth()` (no arguments) on `DocumentBuilder`. Apply `@ApiBearerAuth()` at the **controller class level** (not per-method) for all protected controllers.

**Rationale**: `.addBearerAuth()` registers the OpenAPI standard `"bearer"` HTTP security scheme. This causes Swagger UI to render a top-level **Authorize** button. When a developer enters a JWT and clicks Authorize, Swagger UI automatically injects `Authorization: Bearer <jwt>` into every subsequent request that has `@ApiBearerAuth()` declared.

Controller-level `@ApiBearerAuth()` is preferred over per-method to:

1. Reduce decorator boilerplate per route
2. Make the security requirement clear at the module boundary
3. Avoid forgetting to add the decorator to new methods

**Security scheme name**: The OpenAPI standard name is `"bearer"`. Using a custom name breaks the Swagger UI Authorize dialog binding.

**Alternatives considered**:

- Custom scheme name (e.g., `"JWTAuth"`): non-standard; Swagger UI won't recognise it for the Authorize button.
- OAuth2 flow: unnecessary complexity for Bearer-token-based auth.
- Per-method decorators only: doesn't scale; easy to miss new routes.

---

## 3. DTO Decoration Pattern

**Decision**: Apply **both** `@ApiProperty()` (from `@nestjs/swagger`) **and** `class-validator` decorators (`@IsString()`, `@IsNotEmpty()`, etc.) to the same DTO property. Use `@ApiPropertyOptional()` for optional fields.

**Rationale**: The two decorator sets serve different runtimes:

- `@ApiProperty()` is read at startup by `SwaggerModule` using TypeScript reflection to build the OpenAPI schema
- `@IsNotEmpty()` etc. are evaluated at request time by `ValidationPipe`

They are completely independent — no interaction, no conflict. Both MUST be present to ensure the documented schema matches the enforced schema (no drift).

**Alignment rule**: If `@ApiProperty({ required: true })` is set, a corresponding validator (e.g., `@IsNotEmpty()`) MUST also be present. If `@ApiPropertyOptional()` is used, the property MUST also have `@IsOptional()` in the validator chain.

**Alternatives considered**:

- `@ApiProperty()` only: runtime validation absent; bad payloads reach handlers.
- `class-validator` only: Swagger schema empty; frontend can't inspect the contract.
- NestJS Swagger CLI plugin (auto-generates `@ApiProperty()`): reduces boilerplate but trades explicit control; not adopted to keep decorator intent visible.

---

## 4. Controller Swagger Decorators

**Decision**: Use the following decorators, each at the appropriate level:

| Decorator                                              | Level                             | Purpose                                  |
| ------------------------------------------------------ | --------------------------------- | ---------------------------------------- |
| `@ApiTags('tag-name')`                                 | Controller class                  | Groups endpoints in Swagger UI           |
| `@ApiBearerAuth()`                                     | Controller class (protected only) | Marks all routes as requiring Bearer JWT |
| `@ApiOperation({ summary, description })`              | Method                            | Describes what the endpoint does         |
| `@ApiOkResponse({ type: DtoClass })`                   | Method                            | Documents 200 success shape              |
| `@ApiCreatedResponse({ type: DtoClass })`              | Method                            | Documents 201 created shape              |
| `@ApiBadRequestResponse({ type: ErrorResponseDto })`   | Method                            | Documents 400 validation failure         |
| `@ApiUnauthorizedResponse({ type: ErrorResponseDto })` | Method                            | Documents 401 missing/invalid JWT        |
| `@ApiNotFoundResponse({ type: ErrorResponseDto })`     | Method                            | Documents 404 not found                  |
| `@ApiExtraModels(DtoClass)`                            | Controller or method              | Registers DTOs not in method signatures  |

**Tag naming convention**: singular, PascalCase matching the module name — `System`, `Auth`, `Tenants`, `Properties`. This produces clean section headers in Swagger UI.

**Alternatives considered**:

- Only `@ApiResponse()` (no shorthand): verbose; shorthand aliases set the status code implicitly.
- Auto-tagging from controller name (`autoTagControllers: true`): less control; explicit tags make intent clear.

---

## 5. Global ValidationPipe Configuration

**Decision**: Enable `ValidationPipe` globally in `main.ts` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.

**Rationale**:

- `whitelist: true`: strips properties not declared in the DTO — prevents accidental data passthrough
- `forbidNonWhitelisted: true`: throws `BadRequestException` (400) for unknown properties — catches client bugs early and aligns with FR-009 (consistent error envelope)
- `transform: true`: auto-coerces primitives (e.g., string `"42"` → number `42`) — reduces handler boilerplate

This runs per-request in the NestJS pipeline, completely independent of Swagger schema generation (which runs once at startup). No interaction or conflict between the two.

**Alternatives considered**:

- Per-route `@UsePipes()`: easy to miss a route; global is safer.
- Disable `forbidNonWhitelisted`: allows malformed payloads to reach handlers silently.

---

## 6. Standard Error Envelope

**Decision**: Create `shared/dto/error-response.dto.ts` with class `ErrorResponseDto` mirroring NestJS's built-in `HttpException` envelope: `{ statusCode: number, message: string, error?: string }`. Reference this DTO in all `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiNotFoundResponse` decorators.

**Rationale**: NestJS's default exception filter produces `{ statusCode, message, error }` for all `HttpException` subclasses. By creating a DTO that mirrors this shape and referencing it in every endpoint's error response decorators, Swagger UI shows a consistent, machine-readable error schema. Frontend code generators can infer the error shape from the spec.

**Shape**:

```
ErrorResponseDto {
  statusCode: number   // e.g. 400, 401, 404
  message: string      // e.g. "Bad Request"
  error?: string       // e.g. "Validation failed for field X"
}
```

**Alternatives considered**:

- Separate DTOs per status code: no benefit; all HTTP errors share the same shape.
- Inline description strings in `@ApiResponse()`: not machine-readable; schema consumers can't infer type.
- Custom exception filter with extended shape: unnecessary complexity; default NestJS shape is sufficient.

---

## 7. GET /me Stub Guard Pattern

**Decision**: Create `StubBearerGuard` in `common/guards/`. The guard reads the `Authorization: Bearer <token>` header — throws `UnauthorizedException` if missing or malformed — and attaches a mock identity object `{ userId: 'stub_user_001', tenantId: 'stub_tenant_001' }` to `request.user`. The `SystemController` reads from `request.user` and returns a `MeResponseDto`.

**Rationale**: This approach is explicitly agreed-upon in the spec Assumptions. The stub unblocks:

1. Swagger UI auth flow demonstration (US2)
2. Frontend development against a documented `/me` contract
3. Future Epic 2 guard replacement — only the guard's internal logic changes; the controller, DTO, and endpoint path all remain unchanged

**Future-proof design**: The guard interface (`CanActivate`) and the request context shape (`request.user.userId`, `request.user.tenantId`) are identical to what the real Clerk guard will use. Swapping the stub for the Clerk guard is a single file replacement.

**Guard behaviour**:

- Header present + non-empty value → attach mock identity, allow request
- Header absent or `Authorization: Bearer` with empty token → `throw new UnauthorizedException('Missing or invalid Bearer token')`

**Alternatives considered**:

- No guard, always return mock: defeats the purpose of demonstrating auth; endpoint is always public.
- Use `@SetMetadata('public', true)` to skip guard: opposite of what's needed — we want to demonstrate that the guard fires.
- Full Clerk JWKS verification now: out of scope for this feature; deferred to Epic 2 per spec.

---

## 8. Global Prefix and Swagger Path

**Decision**: Use `ignoreGlobalPrefix: true` in `SwaggerModule.createDocument()` options. Swagger UI is served at `/api/docs`; the OpenAPI JSON is at `/api/docs-json`. The existing global prefix `api/v1` (set in `main.ts`) applies to all API routes but NOT to the docs path.

**Rationale**: Without `ignoreGlobalPrefix: true`, the Swagger UI would appear at `/api/v1/api/docs` — the prefix is doubled. This option decouples the docs path from the API versioning path. The docs path `/api/docs` is intentionally not versioned because the documentation itself is not a versioned API resource.

**Actual route mapping after this feature**:
| Path | What |
|------|------|
| `/api/v1/health` | Health endpoint (callable) |
| `/api/v1/me` | Me endpoint (callable) |
| `/api/docs` | Swagger UI |
| `/api/docs-json` | OpenAPI JSON spec |

**Alternatives considered**:

- Place docs at `/docs`: inconsistent with API namespace.
- Omit global prefix: breaks API versioning strategy.
- Mount docs at `/api/v1/docs`: couples docs version to API version unnecessarily.
