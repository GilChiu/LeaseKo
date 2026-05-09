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

- [ ] Create ListProperties use case
- [ ] Implement tenant-scoped findMany in Property repository
- [ ] Create GET /properties endpoint
- [ ] Add pagination-ready query structure
- [ ] Add Swagger documentation for list properties
- [ ] Add unit tests for ListProperties use case
- [ ] Verify properties from other tenants are not returned

### Acceptance Criteria

- User only sees properties for their current tenant
- Query uses tenantId from request context
- Response returns property list
- No cross-tenant data leakage is possible

---

## User Story 8.3

As a landlord, I want to view a single property so that I can inspect its details.

### Tasks

- [ ] Create GetPropertyById use case
- [ ] Implement tenant-scoped findById in Property repository
- [ ] Create GET /properties/:id endpoint
- [ ] Add Swagger documentation for get property
- [ ] Return 404 when property does not exist in current tenant
- [ ] Add unit tests for GetPropertyById use case

### Acceptance Criteria

- User can view property details by ID
- Property lookup includes id + tenantId
- Property from another tenant returns 404
- No tenant ownership details are leaked

---

## User Story 8.4

As a landlord, I want to update a property so that I can correct or maintain property information.

### Tasks

- [ ] Create UpdateProperty use case
- [ ] Implement tenant-scoped update in Property repository
- [ ] Create UpdateProperty DTO
- [ ] Create PATCH /properties/:id endpoint
- [ ] Add Swagger documentation for update property
- [ ] Add validation rules for update payload
- [ ] Add unit tests for UpdateProperty use case

### Acceptance Criteria

- User can update property details
- Update query includes id + tenantId
- Updating another tenant’s property is not allowed
- Empty or invalid update payload is rejected

---

## User Story 8.5

As a landlord, I want to delete or archive a property so that I can remove inactive property records safely.

### Tasks

- [ ] Decide delete strategy: soft delete vs hard delete
- [ ] Add deletedAt field if soft delete is selected
- [ ] Create DeleteProperty or ArchiveProperty use case
- [ ] Implement tenant-scoped delete/archive in repository
- [ ] Create DELETE /properties/:id endpoint
- [ ] Add Swagger documentation for delete/archive property
- [ ] Add unit tests for delete/archive behavior

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

- [ ] Create Unit Prisma model
- [ ] Add tenantId relation to Unit
- [ ] Add propertyId relation to Unit
- [ ] Add indexes for tenantId and propertyId
- [ ] Add unique rule for unit number per property if appropriate
- [ ] Create Prisma migration for Unit model
- [ ] Define Unit domain entity
- [ ] Define Unit repository interface
- [ ] Implement PrismaUnitRepository
- [ ] Create CreateUnit use case
- [ ] Create CreateUnit DTO
- [ ] Create POST /properties/:propertyId/units endpoint
- [ ] Verify property belongs to current tenant before creating unit
- [ ] Add Swagger documentation for create unit
- [ ] Add unit tests for CreateUnit use case

### Acceptance Criteria

- User can create a unit under a property
- Unit belongs to the same tenant as the property
- Cannot create unit under another tenant’s property
- tenantId comes only from request context

---

## User Story 9.2

As a landlord, I want to view units under a property so that I can see rentable spaces for that property.

### Tasks

- [ ] Create ListUnitsByProperty use case
- [ ] Implement tenant-scoped unit listing
- [ ] Create GET /properties/:propertyId/units endpoint
- [ ] Verify property belongs to current tenant
- [ ] Add Swagger documentation for list units
- [ ] Add unit tests for ListUnitsByProperty use case

### Acceptance Criteria

- User can list units under a property
- Only units from the current tenant are returned
- Units from another tenant are never returned
- Invalid property access returns 404

---

## User Story 9.3

As a landlord, I want to view a single unit so that I can inspect its details.

### Tasks

- [ ] Create GetUnitById use case
- [ ] Implement tenant-scoped findById in Unit repository
- [ ] Create GET /units/:id endpoint
- [ ] Add Swagger documentation for get unit
- [ ] Add unit tests for GetUnitById use case

### Acceptance Criteria

- User can view unit details
- Unit lookup includes id + tenantId
- Unit from another tenant returns 404

---

## User Story 9.4

As a landlord, I want to update a unit so that I can maintain unit details and rent information.

### Tasks

- [ ] Create UpdateUnit use case
- [ ] Implement tenant-scoped update in Unit repository
- [ ] Create UpdateUnit DTO
- [ ] Create PATCH /units/:id endpoint
- [ ] Add validation for rent amount and status
- [ ] Add Swagger documentation for update unit
- [ ] Add unit tests for UpdateUnit use case

### Acceptance Criteria

- User can update unit details
- Update query includes id + tenantId
- Unit from another tenant cannot be updated
- Invalid rent/status values are rejected

---

## User Story 9.5

As a landlord, I want to mark a unit as available or occupied so that I can track occupancy status.

### Tasks

- [ ] Define UnitStatus enum
- [ ] Add status field to Unit model
- [ ] Supported statuses: AVAILABLE, OCCUPIED, MAINTENANCE, INACTIVE
- [ ] Create UpdateUnitStatus use case
- [ ] Create PATCH /units/:id/status endpoint or include status in PATCH /units/:id
- [ ] Add validation for allowed status transitions
- [ ] Add Swagger documentation for status update
- [ ] Add unit tests for status update behavior

### Acceptance Criteria

- Unit status can be updated
- Invalid status values are rejected
- Status update is tenant-scoped
- Unit status is visible in unit list and detail responses

---

# 🔵 EPIC 10: Frontend Property & Unit Screens

## User Story 10.1

As a landlord, I want to view my properties from the dashboard so that I can manage my portfolio visually.

### Tasks

- [ ] Create properties page route
- [ ] Create property list UI
- [ ] Connect frontend to GET /properties API
- [ ] Add loading state
- [ ] Add empty state
- [ ] Add error state
- [ ] Ensure API requests include Clerk JWT
- [ ] Keep business logic in backend only

### Acceptance Criteria

- Authenticated user can view property list
- Empty state appears when no properties exist
- API errors are shown safely
- Frontend does not filter tenant data manually

---

## User Story 10.2

As a landlord, I want to create a property from the UI so that I can add properties without using Swagger/Postman.

### Tasks

- [ ] Create property form component
- [ ] Add client-side UX validation
- [ ] Call POST /properties API
- [ ] Show success state
- [ ] Show validation errors from backend
- [ ] Refresh property list after creation

### Acceptance Criteria

- User can create property from UI
- Backend remains source of validation truth
- Form handles API errors properly

---

## User Story 10.3

As a landlord, I want to manage units from a property page so that I can organize rentable spaces.

### Tasks

- [ ] Create property detail page
- [ ] Display property information
- [ ] Display unit list under property
- [ ] Create add unit form
- [ ] Call GET /properties/:propertyId/units
- [ ] Call POST /properties/:propertyId/units
- [ ] Handle loading, empty, and error states

### Acceptance Criteria

- User can view units under a property
- User can add unit under a property
- Frontend uses backend tenant-scoped APIs
- No tenant filtering logic exists in frontend

---

# 🔵 EPIC 11: Sprint 2 API Documentation & Testing

## User Story 11.1

As a developer, I want Property and Unit endpoints documented so the API remains easy to inspect and test.

### Tasks

- [ ] Add Swagger tags for Properties
- [ ] Add Swagger tags for Units
- [ ] Document all Property endpoints
- [ ] Document all Unit endpoints
- [ ] Document DTO request schemas
- [ ] Document DTO response schemas
- [ ] Document 401, 403, 404, and validation errors

### Acceptance Criteria

- Property endpoints appear in Swagger
- Unit endpoints appear in Swagger
- Protected endpoints show Bearer auth
- Error responses are documented

---

## User Story 11.2

As a developer, I want tests for property and unit logic so tenant isolation remains safe.

### Tasks

- [ ] Add Property use case unit tests
- [ ] Add Unit use case unit tests
- [ ] Test tenant-scoped property queries
- [ ] Test tenant-scoped unit queries
- [ ] Test create unit rejects foreign-tenant property
- [ ] Test update/delete rejects foreign-tenant records
- [ ] Add repository tests if test database setup supports it

### Acceptance Criteria

- Property tests pass
- Unit tests pass
- Cross-tenant access cases are tested
- Business logic can be tested without frontend

---

# ✅ SPRINT 2 DEFINITION OF DONE

- [ ] Property model and migration created
- [ ] Unit model and migration created
- [ ] Property CRUD API working
- [ ] Unit CRUD API working
- [ ] Property → Unit relationship working
- [ ] All Property and Unit queries are tenant-scoped
- [ ] Swagger documentation updated
- [ ] Frontend can list and create properties
- [ ] Frontend can list and create units under a property
- [ ] Tests cover core Property and Unit tenant isolation
- [ ] No business logic added to frontend
- [ ] Lint, typecheck, build, and tests pass

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