# Quickstart: List Properties

**Feature**: 027-list-properties

---

## Testing the Endpoint (Swagger UI)

1. Start the API: `pnpm dev` (or `pnpm db:up` first if DB is not running)
2. Open `http://localhost:3000/api/docs`
3. Click **Authorize** → paste a valid Clerk JWT
4. Find `GET /properties` under the **Properties** tag
5. Click **Try it out** → optionally set `page` and `limit` → **Execute**
6. Expect a `200` response with the paginated envelope

---

## Testing Tenant Isolation (manual)

1. Sign in as Landlord A → create 2 properties via `POST /properties`
2. Sign in as Landlord B → create 3 properties
3. Call `GET /properties` as Landlord A → confirm `total: 2`, all items belong to Landlord A's `tenantId`
4. Call `GET /properties` as Landlord B → confirm `total: 3`, none of Landlord A's properties appear

---

## Running Unit Tests

```powershell
pnpm --filter @leaseKo/api test
```

The new test file `list-properties.use-case.spec.ts` should appear in the results. Look for:
- `ListPropertiesUseCase > returns paginated properties for the tenant`
- `ListPropertiesUseCase > returns empty result when tenant has no properties`
- `ListPropertiesUseCase > does not return properties from a different tenant`

---

## Validation Commands (run after implementation)

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```

All must pass before updating `BACKLOG.md`.
