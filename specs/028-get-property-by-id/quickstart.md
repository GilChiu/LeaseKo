# Quickstart: Get Property by ID

**Feature**: 028-get-property-by-id

---

## Testing the Endpoint (Swagger UI)

1. Start the API: `pnpm dev` (or `pnpm db:up` first if DB is not running)
2. Open `http://localhost:3000/api/docs`
3. Click **Authorize** → paste a valid Clerk JWT
4. Use `POST /properties` to create a property and copy the `id` from the response
5. Find `GET /properties/{id}` under the **Properties** tag
6. Click **Try it out** → enter the `id` → **Execute**
7. Expect `200` with the full property object

---

## Testing Tenant Isolation (manual)

1. Sign in as Landlord A → create a property → note its `id`
2. Sign in as Landlord B (different org)
3. Call `GET /properties/{id}` using Landlord A's property ID with Landlord B's JWT
4. Expect `404` — identical to requesting a non-existent ID

---

## Running Unit Tests

```powershell
pnpm --filter @leaseKo/api test
```

Look for:
- `GetPropertyByIdUseCase > returns the property when found`
- `GetPropertyByIdUseCase > throws NotFoundException when property is not found`
- `GetPropertyByIdUseCase > throws NotFoundException when property belongs to a different tenant`
- `GetPropertyByIdUseCase > calls findById with exact id and tenantId`

---

## Validation Commands (after implementation)

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```
