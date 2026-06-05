# 🧾 PRODUCT BACKLOG — PROPERTY MANAGEMENT SAAS

---

# 🏁 SPRINT 2 — PROPERTY & UNIT MANAGEMENT

## 🎯 Sprint Goal

Allow authenticated tenant users to create, view, update, and manage properties and units inside their tenant workspace with strict tenant isolation.

---

# 🔵 EPIC 8: Property Management

## User Story 8.1

As a landlord, I want to create a property so that I can register properties I manage.

### Tasks

- [x] Create Property Prisma model
- [x] Add tenantId relation to Property
- [x] Add indexes for tenantId
- [x] Create Prisma migration for Property model
- [x] Define Property domain entity
- [x] Define Property repository interface
- [x] Implement PrismaPropertyRepository
- [x] Create CreateProperty use case
- [x] Create CreateProperty DTO
- [x] Create POST /properties endpoint
- [x] Add Swagger documentation for create property
- [x] Add validation rules for property creation
- [x] Add unit tests for CreateProperty use case

### Acceptance Criteria

- Authenticated tenant user can create a property
- Property is always linked to the current tenantId
- tenantId cannot be passed from frontend body/query/header
- Property creation fails without tenant context
- API response follows standard response/error format

---

## User Story 8.2

As a landlord, I want to view all properties in my tenant workspace so that I can manage them.

### Tasks

- [x] Create ListProperties use case
- [x] Implement tenant-scoped findMany in Property repository
- [x] Create GET /properties endpoint
- [x] Add pagination-ready query structure
- [x] Add Swagger documentation for list properties
- [x] Add unit tests for ListProperties use case
- [x] Verify properties from other tenants are not returned

### Acceptance Criteria

- User only sees properties for their current tenant
- Query uses tenantId from request context
- Response returns property list
- No cross-tenant data leakage is possible

---

## User Story 8.3

As a landlord, I want to view a single property so that I can inspect its details.

### Tasks

- [x] Create GetPropertyById use case
- [x] Implement tenant-scoped findById in Property repository
- [x] Create GET /properties/:id endpoint
- [x] Add Swagger documentation for get property
- [x] Return 404 when property does not exist in current tenant
- [x] Add unit tests for GetPropertyById use case

### Acceptance Criteria

- User can view property details by ID
- Property lookup includes id + tenantId
- Property from another tenant returns 404
- No tenant ownership details are leaked

---

## User Story 8.4

As a landlord, I want to update a property so that I can correct or maintain property information.

### Tasks

- [x] Create UpdateProperty use case
- [x] Implement tenant-scoped update in Property repository
- [x] Create UpdateProperty DTO
- [x] Create PATCH /properties/:id endpoint
- [x] Add Swagger documentation for update property
- [x] Add validation rules for update payload
- [x] Add unit tests for UpdateProperty use case

### Acceptance Criteria

- User can update property details
- Update query includes id + tenantId
- Updating another tenant’s property is not allowed
- Empty or invalid update payload is rejected

---

## User Story 8.5

As a landlord, I want to delete or archive a property so that I can remove inactive property records safely.

### Tasks

- [x] Decide delete strategy: soft delete vs hard delete
- [x] Add deletedAt field if soft delete is selected
- [x] Create DeleteProperty or ArchiveProperty use case
- [x] Implement tenant-scoped delete/archive in repository
- [x] Create DELETE /properties/:id endpoint
- [x] Add Swagger documentation for delete/archive property
- [x] Add unit tests for delete/archive behavior

### Acceptance Criteria

- Property removal is tenant-scoped
- Deleting another tenant’s property is not allowed
- If soft delete is used, deleted properties do not appear in normal list results
- Related unit behavior is clearly handled

---

# 🔵 EPIC 9: Unit Management

## User Story 9.1

As a landlord, I want to create units under a property so that I can manage rentable spaces.

### Tasks

- [x] Create Unit Prisma model
- [x] Add tenantId relation to Unit
- [x] Add propertyId relation to Unit
- [x] Add indexes for tenantId and propertyId
- [x] Add unique rule for unit number per property if appropriate
- [x] Create Prisma migration for Unit model
- [x] Define Unit domain entity
- [x] Define Unit repository interface
- [x] Implement PrismaUnitRepository
- [x] Create CreateUnit use case
- [x] Create CreateUnit DTO
- [x] Create POST /properties/:propertyId/units endpoint
- [x] Verify property belongs to current tenant before creating unit
- [x] Add Swagger documentation for create unit
- [x] Add unit tests for CreateUnit use case

### Acceptance Criteria

- User can create a unit under a property
- Unit belongs to the same tenant as the property
- Cannot create unit under another tenant’s property
- tenantId comes only from request context

---

## User Story 9.2

As a landlord, I want to view units under a property so that I can see rentable spaces for that property.

### Tasks

- [x] Create ListUnitsByProperty use case
- [x] Implement tenant-scoped unit listing
- [x] Create GET /properties/:propertyId/units endpoint
- [x] Verify property belongs to current tenant
- [x] Add Swagger documentation for list units
- [x] Add unit tests for ListUnitsByProperty use case

### Acceptance Criteria

- User can list units under a property
- Only units from the current tenant are returned
- Units from another tenant are never returned
- Invalid property access returns 404

---

## User Story 9.3

As a landlord, I want to view a single unit so that I can inspect its details.

### Tasks

- [x] Create GetUnitById use case
- [x] Implement tenant-scoped findById in Unit repository
- [x] Create GET /units/:id endpoint
- [x] Add Swagger documentation for get unit
- [x] Add unit tests for GetUnitById use case

### Acceptance Criteria

- User can view unit details
- Unit lookup includes id + tenantId
- Unit from another tenant returns 404

---

## User Story 9.4

As a landlord, I want to update a unit so that I can maintain unit details and rent information.

### Tasks

- [x] Create UpdateUnit use case
- [x] Implement tenant-scoped update in Unit repository
- [x] Create UpdateUnit DTO
- [x] Create PATCH /units/:id endpoint
- [x] Add validation for rent amount and status
- [x] Add Swagger documentation for update unit
- [x] Add unit tests for UpdateUnit use case

### Acceptance Criteria

- User can update unit details
- Update query includes id + tenantId
- Unit from another tenant cannot be updated
- Invalid rent/status values are rejected

---

## User Story 9.5

As a landlord, I want to manage a unit's occupancy status so that I can accurately track the lifecycle of each unit across available, occupied, maintenance, and inactive states.

**Spec**: [`specs/035-manage-unit-status/spec.md`](specs/035-manage-unit-status/spec.md)

### Tasks

- [x] Define UnitStatus enum (AVAILABLE, OCCUPIED, MAINTENANCE — existing)
- [x] Add INACTIVE to UnitStatus enum and migrate schema
- [x] Add status field to Unit model (existing)
- [x] Include status in PATCH /units/:id (implemented in US 9.4)
- [x] Implement status transition guard in UpdateUnit use case (enforce permitted transitions, reject INACTIVE terminal state)
- [x] Add unit tests for all transition scenarios (valid, invalid, terminal, same-status no-op, cross-tenant)
- [x] Add Swagger documentation for transition error responses (422 Unprocessable)

### Acceptance Criteria

- Unit status can be updated
- Invalid status values are rejected
- Status update is tenant-scoped
- Unit status is visible in unit list and detail responses

---

# 🔵 EPIC 10: Frontend Property & Unit Screens

## User Story 10.0

As a landlord, I want to create and switch my workspace (organisation) from within the app so that I can access my tenant-scoped data without needing the Clerk Dashboard.

> **Prerequisite for all Epic 10 stories.** Without an active organisation, the backend returns 403 and no property/unit data is accessible.

**Spec**: [`specs/037-workspace-onboarding/spec.md`](specs/037-workspace-onboarding/spec.md)

### Tasks

- [x] Add workspace control to the dashboard header alongside the user account button — redirects to `/properties` after workspace creation or switching
- [x] Verify workspace creation resolves the 403 access error banner on `/properties`
- [x] Verify active workspace name is visible in header at all times
- [x] Verify returning users do not need to re-select their workspace on re-login

### Acceptance Criteria

- A new user can create their workspace directly from the dashboard without leaving the app
- Switching organisations updates the active tenant context
- After creating an org, the Properties page loads (empty state or list) instead of the 403 banner

---

## User Story 10.1

As a landlord, I want to view my properties from the dashboard so that I can manage my portfolio visually.

**Spec**: [`specs/036-list-properties-ui/spec.md`](specs/036-list-properties-ui/spec.md)

### Tasks

- [x] Create properties page route (`/properties`)
- [x] Create property list UI (name, address, property type per card)
- [x] Connect frontend to GET /properties API with Clerk JWT
- [x] Add loading state (distinct from empty state)
- [x] Add empty state (message + add-property affordance)
- [x] Add error states (401 redirect, 403 inline, 500/network + retry)
- [x] Wire sidebar "Properties" entry as a working link with active highlight
- [x] Keep all filtering/scoping logic in backend only

### Acceptance Criteria

- Authenticated user can view property list
- Empty state appears when no properties exist
- API errors are shown safely
- Frontend does not filter tenant data manually

---

## User Story 10.2

As a landlord, I want to create a property from the UI so that I can add properties without using Swagger/Postman.

**Spec**: [`specs/038-create-property-form/spec.md`](specs/038-create-property-form/spec.md)

### Tasks

- [x] Create `/properties/new` page with a form for all 9 property fields (5 required, 4 optional)
- [x] Add client-side pre-validation (required fields + max-length), all errors shown simultaneously
- [x] Submit via POST /properties with Clerk JWT; omit blank optional fields from request body
- [x] Show field-level backend errors under relevant fields; general errors as banner above form
- [x] Show loading state on submit button; prevent duplicate submissions
- [x] On success, redirect to `/properties` list (property immediately visible)
- [x] Add Cancel button returning to `/properties` without saving

### Acceptance Criteria

- User can create property from UI
- Backend remains source of validation truth
- Form handles API errors properly

---

## User Story 10.3

As a landlord, I want to manage units from a property page so that I can organize rentable spaces.

**Spec**: [`specs/039-property-detail-units/spec.md`](specs/039-property-detail-units/spec.md)

### Tasks

- [x] Create property detail page (`/properties/:id`) — shows name, address, type, description
- [x] Make property cards on the list page navigate to `/properties/:id`
- [x] Display unit list under property (unit number, status, floor area, bedrooms, bathrooms, monthly rent)
- [x] Add empty state when property has no units
- [x] Create inline add-unit form (unit number required; floor area, bedrooms, bathrooms, monthly rent, description optional)
- [x] Call GET /properties/:id for property details with Clerk JWT
- [x] Call GET /properties/:propertyId/units for unit list with Clerk JWT
- [x] Call POST /properties/:propertyId/units to create a unit; refresh list on success
- [x] Handle loading, empty, error states (404/not-found, 401 redirect, 403 inline, 5xx/network + retry)
- [x] Client-side validation: unit number required, max 50 chars; all errors simultaneous
- [x] Server error mapping: field-level errors under inputs, general errors as banner

### Acceptance Criteria

- User can view property details and its units from a dedicated detail page
- User can add a unit inline; list refreshes immediately on success
- Duplicate unit number shows a field-level error (not a generic banner)
- Frontend uses backend tenant-scoped APIs
- No tenant filtering logic exists in frontend

---

# 🔵 EPIC 11: Sprint 2 API Documentation & Testing

## User Story 11.1

As a developer, I want Property and Unit endpoints documented so the API remains easy to inspect and test.

### Tasks

- [x] Add Swagger tags for Properties
- [x] Add Swagger tags for Units
- [x] Document all Property endpoints
- [x] Document all Unit endpoints
- [x] Document DTO request schemas
- [x] Document DTO response schemas
- [x] Document 401, 403, 404, and validation errors

### Acceptance Criteria

- Property endpoints appear in Swagger
- Unit endpoints appear in Swagger
- Protected endpoints show Bearer auth
- Error responses are documented

---

## User Story 11.2

As a developer, I want tests for property and unit logic so tenant isolation remains safe.

### Tasks

- [x] Add Property use case unit tests
- [x] Add Unit use case unit tests
- [x] Test tenant-scoped property queries
- [x] Test tenant-scoped unit queries
- [x] Test create unit rejects foreign-tenant property
- [x] Test update/delete rejects foreign-tenant records
- [x] Add repository tests if test database setup supports it

### Acceptance Criteria

- Property tests pass
- Unit tests pass
- Cross-tenant access cases are tested
- Business logic can be tested without frontend

---

# ✅ SPRINT 2 DEFINITION OF DONE

- [x] Property model and migration created
- [x] Unit model and migration created
- [x] Property CRUD API working
- [x] Unit CRUD API working
- [x] Property → Unit relationship working
- [x] All Property and Unit queries are tenant-scoped
- [x] Swagger documentation updated
- [x] Frontend can list and create properties
- [x] Frontend can list and create units under a property
- [x] Tests cover core Property and Unit tenant isolation
- [x] No business logic added to frontend
- [x] Lint, typecheck, build, and tests pass

---

# 🧭 NEXT SPRINT PREVIEW (SPRINT 3)

## Epics

- Tenant CRM
- Lease Management

## Features

- Create tenant/customer records
- Assign tenant/customer to unit
- Create lease
- Track lease start/end dates
- Mark active/expired leases