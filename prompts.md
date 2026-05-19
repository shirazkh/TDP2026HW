# IssueFlow AI Prompts and Outcomes

This file documents the AI-assisted development journey for IssueFlow. Update it at the end of each phase with the prompts used, decisions made, files changed, verification performed, and any follow-up work.

## Model Used

- Primary model: GPT-5.5
- Environment: Cursor Cloud autonomous coding agent

## Architecture Methodology

- Treat the README API table as the external implementation contract.
- Treat the IssueFlow requirements PDF as the source of business constraints.
- Implement the system phase by phase according to `DEVELOPMENT_PLAN.md`.
- Preserve strict domain boundaries between NestJS modules.
- Keep controllers thin and place business rules in services.
- Use TypeORM and PostgreSQL for persistence.
- Use transactions for multi-record state changes and audit logging.
- Enforce business invariants through service-level checks and DTO validation.
- Add focused tests for high-risk behavior before considering a phase complete.

## Global Requirement Notes

- All protected APIs require JWT authentication.
- Tickets and comments require optimistic-locking protection for concurrent updates.
- Ticket status transitions are forward-only: `TODO -> IN_PROGRESS -> IN_REVIEW -> DONE`.
- Tickets cannot be updated after reaching `DONE`.
- Tickets cannot transition to `DONE` with unresolved blockers.
- Projects and tickets use soft delete only.
- All state-changing actions require append-only audit log entries.
- Automated actions such as auto-assignment and auto-escalation use actor `SYSTEM`.
- Mentions are matched case-insensitively.
- Auto-escalation changes priority and overdue state only; it never changes status.

## Phase 0: Requirements and Planning

### Prompt(s)

- Initial request: review the attached IssueFlow requirements PDF and inspect the skeleton repository without writing code.
- Planning request: create `DEVELOPMENT_PLAN.md` with phases, file checklists, and explicit business constraints.
- Rules/template request: generate `.cursorrules` and initialize this `prompts.md` template.

### Outcome

- Confirmed the repository is a minimal NestJS skeleton with TypeORM/PostgreSQL dependencies and `compose.yml`, but no active TypeORM configuration or domain modules.
- Created `DEVELOPMENT_PLAN.md`.
- Created `.cursorrules`.
- Initialized `prompts.md`.

### Decisions and Open Questions

- Credential model decision: Phase 2 adds a password column and uses a hashed fallback default password when registration or seed input omits credentials. This resolves the conflict between the required `/auth/login` endpoint and the README user creation contract, which does not include a password field.
- Project-linked developer modeling must be resolved because auto-assignment mentions users linked to the project but the README does not define membership endpoints.

### Verification

- Documentation-only changes; no application tests required.

## Phase 1: DB and Entities

### Prompt(s)

- Execute Phase 1: Project Foundation, Database Configuration, and Entities exactly as described in `DEVELOPMENT_PLAN.md`.
- Implement TypeORM PostgreSQL configuration in `AppModule`, ensure the connection loads correctly, and create core entities with relationships, soft-delete fields, and optimistic-locking version columns.
- Provide guidance for running `npm run start:dev` and verifying database table generation.

### Implementation Summary

- Added TypeORM PostgreSQL configuration with environment-variable defaults matching `compose.yml`.
- Enabled development schema synchronization by default through `TYPEORM_SYNCHRONIZE=true`.
- Added a global Nest validation pipe with transformation, whitelist, and non-whitelisted property rejection.
- Added shared enum definitions for user roles, ticket status, ticket priority, ticket type, audit actions, audit entity types, and audit actors.
- Added a shared base entity with generated ID, `createdAt`, and `updatedAt` columns.
- Added core TypeORM entities and relationships for users, projects, tickets, comments, ticket dependencies, and audit logs.
- Added `@VersionColumn` to tickets and comments for optimistic-locking support.
- Added soft-delete support for projects and tickets through `@DeleteDateColumn`.

### Files Changed

- `.env.example`
- `src/app.module.ts`
- `src/main.ts`
- `src/audit-logs/audit-log.entity.ts`
- `src/comments/comment.entity.ts`
- `src/common/entities/base.entity.ts`
- `src/common/enums/audit-action.enum.ts`
- `src/common/enums/audit-actor.enum.ts`
- `src/common/enums/audit-entity-type.enum.ts`
- `src/common/enums/ticket-priority.enum.ts`
- `src/common/enums/ticket-status.enum.ts`
- `src/common/enums/ticket-type.enum.ts`
- `src/common/enums/user-role.enum.ts`
- `src/config/database.config.ts`
- `src/projects/project.entity.ts`
- `src/tickets/ticket-dependency.entity.ts`
- `src/tickets/ticket.entity.ts`
- `src/users/user.entity.ts`

### Business Rules Covered

- User roles are represented as `ADMIN` and `DEVELOPER`.
- Ticket statuses are represented as `TODO`, `IN_PROGRESS`, `IN_REVIEW`, and `DONE`.
- Ticket priorities are represented as `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`.
- Ticket types are represented as `BUG`, `FEATURE`, and `TECHNICAL`.
- Tickets belong to exactly one project.
- Comments belong to exactly one ticket and one author.
- Projects and tickets have soft-delete columns.
- Tickets and comments have version columns to support optimistic locking in later service logic.
- Audit logs capture action, entity type, entity ID, actor, optional performer, metadata, and timestamp.

### Verification

- `npm install --no-package-lock` completed successfully to install existing project dependencies in the cloud environment.
- `npm run build` passed.
- Local verification was completed by the project owner after pulling the Phase 1 branch:
  - `docker compose up -d db` started PostgreSQL successfully.
  - `npm run start:dev` started the NestJS application successfully.
  - TypeORM connected to PostgreSQL and generated the schema successfully.
  - Core tables were verified in PostgreSQL, including `users`, `projects`, `tickets`, `comments`, `ticket_dependencies`, and `audit_logs`.
  - `tickets.version` and `comments.version` were verified for optimistic-locking support.
  - `tickets.deleted_at` and `projects.deleted_at` were verified for soft-delete support.
- Phase 1 was approved after local database bootstrap verification.

### Follow-ups

- Implement service-level optimistic-lock checks when ticket and comment update endpoints are added.
- Resolve the credential model during Phase 2 because the auth API requires a password but the README user creation example does not include one.

## Phase 2: Auth

### Prompt(s)

- Execute Phase 2: Authentication, Authorization, and Request Context exactly as outlined in `DEVELOPMENT_PLAN.md`.
- Add a password column to the `User` entity with `select: false`.
- Use bcrypt for hashing and fall back to the secure default password `Password123!` when no password is provided.
- Create `AuthModule`, `AuthController`, and `AuthService`.
- Implement `POST /auth/login`, `POST /auth/logout`, and `GET /auth/me`.
- Implement Passport JWT strategy, JWT auth guard, roles guard, `@Roles`, and `@CurrentUser`.
- Add a server-side token revocation strategy for logout.

### Implementation Summary

- Installed authentication dependencies for JWT, Passport, passport-jwt, and bcrypt.
- Added `password` to `User` with `select: false` so it is excluded from standard TypeORM reads and normal API serialization paths.
- Added bcrypt password hashing with a secure default fallback of `Password123!`.
- Documented the password strategy tradeoff: a hardcoded fallback credential is a known production security anti-pattern, commonly associated with CWE-259. It is intentionally limited to this assignment design because the README registration contract omits a password field while the requirements still mandate a functioning `/auth/login` endpoint; this preserves compatibility with external grading and automated tests that may create users using the documented README shape.
- Added a `UsersModule` and `UsersService` foundation for user lookup, request-user mapping, and future user creation with hashed passwords.
- Added `AuthModule`, `AuthController`, and `AuthService`.
- Implemented `POST /auth/login` with `LoginDto` validation, bcrypt credential verification, and stateless JWT response `{ accessToken, tokenType, expiresIn }`.
- Implemented `POST /auth/logout` using a persisted `RevokedToken` deny-list table keyed by SHA-256 token hash.
- Implemented `GET /auth/me` using request context populated by the JWT strategy.
- Added Passport JWT strategy using bearer tokens, expiry validation, revocation checks, and user lookup.
- Added global JWT auth guard and roles guard through `APP_GUARD`.
- Added `@Public`, `@Roles`, and `@CurrentUser` decorators.
- Added JWT environment variables to `.env.example`.

### Files Changed

- `.env.example`
- `package.json`
- `package-lock.json`
- `prompts.md`
- `src/app.module.ts`
- `src/config/database.config.ts`
- `src/users/user.entity.ts`
- `src/users/user-password.constants.ts`
- `src/users/users.module.ts`
- `src/users/users.service.ts`
- `src/auth/auth.constants.ts`
- `src/auth/auth.controller.ts`
- `src/auth/auth.module.ts`
- `src/auth/auth.service.ts`
- `src/auth/decorators/current-user.decorator.ts`
- `src/auth/decorators/public.decorator.ts`
- `src/auth/decorators/roles.decorator.ts`
- `src/auth/dto/login.dto.ts`
- `src/auth/entities/revoked-token.entity.ts`
- `src/auth/guards/jwt-auth.guard.ts`
- `src/auth/guards/roles.guard.ts`
- `src/auth/interfaces/jwt-payload.interface.ts`
- `src/auth/strategies/jwt.strategy.ts`
- `src/common/interfaces/request-user.interface.ts`

### Business Rules Covered

- JWT authentication is now the default protection mechanism through a global guard.
- `POST /auth/login` is public and validates username/password input through class-validator.
- Passwords are hashed with bcrypt before persistence and are not selected by default.
- Missing user passwords fall back to `Password123!` before hashing.
- The fallback default password is explicitly documented as an assignment compatibility mechanism, not a production-ready credential strategy.
- `POST /auth/login` verifies credentials with bcrypt and returns a signed JWT access token.
- `POST /auth/logout` invalidates the current bearer token through a server-side deny-list.
- Revoked tokens are stored by hash instead of raw token value.
- `GET /auth/me` returns the authenticated request user's profile without password data.
- `@Roles(UserRole.ADMIN)` support is available for ADMIN-only endpoints in later phases.
- `@CurrentUser()` exposes authenticated user context to controllers without manually reading the request.

### Verification

- `npm run build` passed.
- `npm test -- --runInBand` passed.

### Follow-ups

- Add auth-focused unit/e2e tests once user creation endpoints or seed data are available.
- Apply `@Roles(UserRole.ADMIN)` to deleted/restore endpoints when those endpoints are implemented.
- Use `UsersService.create` for Phase 3 user creation so password hashing and the default password fallback are consistently applied.

## Phase 3: Core API

### Prompt(s)

- TODO: Add the user's Phase 3 execution prompt here.

### Implementation Summary

- TODO: Summarize users, projects, tickets, and comments CRUD implementation.

### Files Changed

- TODO: List files created or modified.

### Business Rules Covered

- TODO: List constraints implemented during this phase.

### Verification

- TODO: List commands/tests run and results.

### Follow-ups

- TODO: List unresolved items or next-phase handoffs.

## Phase 4: Business Rules and Concurrency

### Prompt(s)

- TODO: Add the user's Phase 4 execution prompt here.

### Implementation Summary

- TODO: Summarize state machine, optimistic locking, audit logging, and rule enforcement.

### Files Changed

- TODO: List files created or modified.

### Business Rules Covered

- TODO: List constraints implemented during this phase.

### Verification

- TODO: List commands/tests run and results.

### Follow-ups

- TODO: List unresolved items or next-phase handoffs.

## Phase 5: Extended Features

### Prompt(s)

- TODO: Add the user's Phase 5 execution prompt here.

### Implementation Summary

- TODO: Summarize dependencies, attachments, CSV import/export, soft-delete restore, mentions, auto-escalation, and auto-assignment.

### Files Changed

- TODO: List files created or modified.

### Business Rules Covered

- TODO: List constraints implemented during this phase.

### Verification

- TODO: List commands/tests run and results.

### Follow-ups

- TODO: List unresolved items or next-phase handoffs.

## Phase 6: Testing and Documentation

### Prompt(s)

- TODO: Add the user's Phase 6 execution prompt here.

### Implementation Summary

- TODO: Summarize final tests, `run.md`, README updates if any, and final prompt documentation updates.

### Files Changed

- TODO: List files created or modified.

### Business Rules Covered

- TODO: List constraints verified or documented during this phase.

### Verification

- TODO: List commands/tests run and results.

### Follow-ups

- TODO: List unresolved items, residual risks, or final submission notes.
