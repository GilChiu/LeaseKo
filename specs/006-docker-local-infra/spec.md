# Feature Specification: Local Infrastructure — Docker, PostgreSQL, Redis

**Feature Branch**: `006-docker-local-infra`  
**Created**: 2026-05-02  
**Status**: Draft  
**Input**: User description: "Set up local infrastructure for the existing pnpm + Turborepo monorepo so the Property Management SaaS can run locally with the required backend dependencies (PostgreSQL, Redis)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Start Local Infrastructure (Priority: P1)

As a developer, I want to start all local backend services with a single command so I can begin developing without manually configuring databases or caches.

**Why this priority**: Without PostgreSQL and Redis running locally, the NestJS backend cannot start. This is the foundational blocker for all development work.

**Independent Test**: Run the start command, observe both PostgreSQL and Redis containers reach a healthy state, and confirm the backend API starts without connection errors.

**Acceptance Scenarios**:

1. **Given** Docker is installed and the repository is cloned, **When** the developer runs the infrastructure start command, **Then** both PostgreSQL and Redis containers start and report healthy status within 60 seconds.
2. **Given** the containers are already running, **When** the developer runs the start command again, **Then** the system reuses the existing containers without duplication or errors.
3. **Given** containers were stopped without deleting volumes, **When** the developer restarts infrastructure, **Then** previously stored PostgreSQL data is restored automatically.

---

### User Story 2 — Backend Connection Validation (Priority: P1)

As a backend developer, I want the NestJS application to validate that all required connection variables are present at startup so misconfiguration is caught immediately and not silently.

**Why this priority**: Silent failures caused by missing environment variables are difficult to diagnose. Fast failure at startup prevents wasted debugging time.

**Independent Test**: Start the NestJS backend without `DATABASE_URL` set. Observe a clear, actionable error message at startup. The process must exit with a non-zero code.

**Acceptance Scenarios**:

1. **Given** `DATABASE_URL` is missing from the environment, **When** the NestJS app starts, **Then** startup fails immediately with a message identifying the missing variable.
2. **Given** `REDIS_URL` is missing from the environment, **When** the NestJS app starts, **Then** startup fails immediately with a message identifying the missing variable.
3. **Given** both `DATABASE_URL` and `REDIS_URL` are set to valid format strings, **When** the NestJS app starts, **Then** the application starts without validation errors.

---

### User Story 3 — Environment Setup Documentation (Priority: P2)

As a developer onboarding to the project, I want clear environment variable examples and developer commands documented so I can configure my local environment correctly without external help.

**Why this priority**: Without documentation, each developer must rediscover the setup steps independently, wasting time and introducing inconsistency.

**Independent Test**: Follow the documented setup steps from a clean repository clone and successfully start the backend API connected to local infrastructure, without needing to ask any questions.

**Acceptance Scenarios**:

1. **Given** a freshly cloned repository, **When** the developer follows the documented steps, **Then** they can copy the env example files, start containers, and run the backend with valid connections.
2. **Given** a developer copies `apps/api/.env.example` to `apps/api/.env`, **When** they start the backend without modification, **Then** it connects to the locally running Docker services.

---

### User Story 4 — Infrastructure Lifecycle Management (Priority: P2)

As a developer, I want convenience commands to stop, view logs, and reset local infrastructure so I can manage the development environment efficiently.

**Why this priority**: Without lifecycle commands, developers resort to manual Docker commands, creating inconsistency and risk of data corruption.

**Independent Test**: Run each lifecycle command (stop, logs, reset) and confirm the expected effect — services stop, logs display, volumes are removed on reset.

**Acceptance Scenarios**:

1. **Given** containers are running, **When** the developer runs the stop command, **Then** all containers stop gracefully without data loss.
2. **Given** containers are running, **When** the developer runs the logs command for a service, **Then** the service logs are displayed in the terminal.
3. **Given** the developer wants a clean database, **When** they run the reset command, **Then** containers stop, volumes are removed, and the next start creates a fresh database.

---

### Edge Cases

- What happens when Docker is not installed? The start command fails with a clear Docker-not-found error.
- What happens when port 5432 or 6379 is already in use on the host? The Docker container fails to bind; the error message identifies the conflicting port.
- What happens when the `.env` file is missing entirely? The NestJS backend fails at startup with a validation error listing all missing required variables.
- What happens after `docker:reset`? The next `docker:up` starts with a fresh, empty PostgreSQL database — any previously migrated schema must be re-applied.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A Docker Compose configuration file MUST define both a `postgres` and a `redis` service using official, version-pinned images.
- **FR-002**: The PostgreSQL service MUST persist data using a named volume so data survives container restarts.
- **FR-003**: The PostgreSQL service MUST be configurable via environment variables for user, password, database name, and port, with safe local development defaults.
- **FR-004**: The Redis service MUST expose port 6379 locally and be compatible with BullMQ queue connections.
- **FR-005**: Environment variable example files (`apps/api/.env.example`) MUST document `DATABASE_URL` and `REDIS_URL` with values that connect to the local Docker services by default.
- **FR-006**: The NestJS backend MUST validate `DATABASE_URL` and `REDIS_URL` at startup and fail fast with a descriptive error if either is absent.
- **FR-007**: The root package.json MUST provide scripts to start (`docker:up`), stop (`docker:down`), inspect logs (`docker:logs`), and reset (`docker:reset`) the local infrastructure.
- **FR-008**: No plaintext production credentials, real passwords, or production connection strings MUST appear in any committed file.
- **FR-009**: All `.env` files containing real values MUST be excluded from version control; only `.env.example` files are committed.
- **FR-010**: Developer documentation MUST describe how to start, stop, and reset local infrastructure, and how to configure `DATABASE_URL` and `REDIS_URL`.

### Key Entities

- **Docker Compose service (postgres)**: Local PostgreSQL instance for development. Holds the application's relational data. Connected to via `DATABASE_URL`. Compatible with future Prisma migrations.
- **Docker Compose service (redis)**: Local Redis instance for development. Used as the broker for BullMQ async queues and future caching. Connected to via `REDIS_URL`.
- **Named volume (postgres_data)**: Persistent storage for PostgreSQL data. Survives container restarts; destroyed only by explicit reset.
- **Environment variable (DATABASE_URL)**: Full connection string for PostgreSQL. Format: `postgresql://<user>:<password>@<host>:<port>/<database>`. Read by the NestJS backend at startup.
- **Environment variable (REDIS_URL)**: Full connection URL for Redis. Format: `redis://<host>:<port>`. Read by the NestJS backend at startup.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A developer with Docker installed can start all local services with a single command and have both containers in a healthy state within 60 seconds on a standard developer machine.
- **SC-002**: PostgreSQL data survives a full `docker:down` / `docker:up` cycle without data loss (verified by writing a record before stop and reading it after restart).
- **SC-003**: The NestJS backend produces a clear, human-readable error message and exits with a non-zero code within 5 seconds when `DATABASE_URL` or `REDIS_URL` is absent.
- **SC-004**: A developer following only the documented setup steps in the repository can complete local environment setup in under 10 minutes from a clean clone.
- **SC-005**: Zero plaintext production credentials appear in any committed file across the entire repository at the time this feature is merged.

## Assumptions

- Docker Desktop (or Docker Engine + Compose plugin) is the responsibility of the individual developer to install; this feature documents the requirement but does not automate Docker installation.
- Local development defaults use simple, non-sensitive credentials (`postgres/postgres`) clearly marked as development-only.
- The Docker Compose file is placed at `infra/docker-compose.yml` to keep infrastructure concerns separate from application code.
- Prisma schema and BullMQ workers are out of scope for this feature; this feature only ensures the services are running and connection strings are configured.
- The `adminer` database GUI service may be included in the Docker Compose file as a developer convenience tool; it is not a required deliverable.
- `apps/web/.env.example` does not require `DATABASE_URL` or `REDIS_URL` — those are backend concerns only.
- The existing `validation.schema.ts` already validates `DATABASE_URL` and `REDIS_URL` as required — this feature verifies and documents that behavior rather than re-implementing it.
