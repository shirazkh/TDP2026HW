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

- Execute Phase 3: Core CRUD APIs exactly as outlined in `DEVELOPMENT_PLAN.md`.
- Implement complete CRUD modules, controllers, services, and strict DTO validation for Users, Projects, Tickets, and nested Ticket Comments.
- Follow the README contract exactly, including `POST /users/update/:id` for user updates.
- Keep all endpoints protected by the global JWT guard from Phase 2.
- Ensure standard Project and Ticket reads hide soft-deleted records.

### Implementation Summary

- Added Users CRUD controller endpoints for list, read, create, update, and delete.
- Extended `UsersService` to support listing, updating, deletion, and password-safe response mapping.
- Added Projects CRUD module with create/read/list/update and soft-delete behavior.
- Added Tickets CRUD module with project-scoped listing, create/read/update, and soft-delete behavior.
- Added nested Comments CRUD module under `/tickets/:ticketId/comments`.
- Added strict class-validator DTOs for create/update inputs across all four domains.
- Added response mappers so standard API responses do not expose internal fields such as user passwords or soft-delete timestamps.
- Wired `UsersModule`, `ProjectsModule`, `TicketsModule`, and `CommentsModule` into `AppModule`; all new endpoints inherit the global JWT and roles guards.
- Used standard TypeORM repository reads for projects and tickets so soft-deleted rows are excluded by default.

### Files Changed

- `prompts.md`
- `src/app.module.ts`
- `src/users/users.module.ts`
- `src/users/users.service.ts`
- `src/users/users.controller.ts`
- `src/users/dto/create-user.dto.ts`
- `src/users/dto/update-user.dto.ts`
- `src/users/dto/user-response.dto.ts`
- `src/projects/projects.module.ts`
- `src/projects/projects.controller.ts`
- `src/projects/projects.service.ts`
- `src/projects/dto/create-project.dto.ts`
- `src/projects/dto/update-project.dto.ts`
- `src/projects/dto/project-response.dto.ts`
- `src/tickets/tickets.module.ts`
- `src/tickets/tickets.controller.ts`
- `src/tickets/tickets.service.ts`
- `src/tickets/dto/create-ticket.dto.ts`
- `src/tickets/dto/update-ticket.dto.ts`
- `src/tickets/dto/ticket-response.dto.ts`
- `src/comments/comments.module.ts`
- `src/comments/comments.controller.ts`
- `src/comments/comments.service.ts`
- `src/comments/dto/create-comment.dto.ts`
- `src/comments/dto/update-comment.dto.ts`
- `src/comments/dto/comment-response.dto.ts`

### Business Rules Covered

- Users API implemented:
  - `GET /users`
  - `GET /users/:userId`
  - `POST /users`
  - `POST /users/update/:userId`
  - `DELETE /users/:userId`
- Projects API implemented:
  - `GET /projects`
  - `GET /projects/:projectId`
  - `POST /projects`
  - `PATCH /projects/:projectId`
  - `DELETE /projects/:projectId`
- Tickets API implemented:
  - `GET /tickets?projectId=:projectId`
  - `GET /tickets/:ticketId`
  - `POST /tickets`
  - `PATCH /tickets/:ticketId`
  - `DELETE /tickets/:ticketId`
- Comments API implemented:
  - `GET /tickets/:ticketId/comments`
  - `POST /tickets/:ticketId/comments`
  - `PATCH /tickets/:ticketId/comments/:commentId`
  - `DELETE /tickets/:ticketId/comments/:commentId`
- DTO validation enforces required fields, numeric IDs, ISO-8601 due dates, and enum values for user roles and ticket status/priority/type.
- User creation uses `UsersService.create`, preserving bcrypt hashing and the default password fallback strategy from Phase 2.
- Project creation verifies the owner user exists.
- Ticket creation verifies the project exists and optional assignee exists.
- Comment creation verifies the ticket and author exist.
- Standard Project and Ticket list/read operations hide soft-deleted records through TypeORM default soft-delete filtering.
- Project and Ticket delete endpoints perform soft deletes.
- All new endpoints are protected by the global JWT guard; no CRUD endpoint is marked public.

### Verification

- `npm run build` passed.
- `npm test -- --runInBand` passed.

### Follow-ups

- Add service-level business rules in Phase 4: optimistic-lock conflict handling, ticket state machine validation, `DONE` immutability, dependency blocking, and audit logging.
- Add broader e2e coverage once seeded/authenticated test setup is available.

## Phase 4: Business Rules and Concurrency

### Prompt(s)

- Execute Phase 4: Business Rules, State Machine, Audit Logging, and Concurrency exactly as outlined in `DEVELOPMENT_PLAN.md`.
- Enforce strict ticket status progression: `TODO -> IN_PROGRESS -> IN_REVIEW -> DONE`.
- Reject backward status transitions and illegal skipped transitions with `BadRequestException`.
- Reject every attempted modification of a `DONE` ticket with `BadRequestException`.
- Explicitly handle optimistic locking for ticket and comment updates using the TypeORM `@VersionColumn` values and return graceful `ConflictException` errors for stale requests.
- Implement `AuditLogsModule`, `AuditLogsService`, and `AuditLogsController`.
- Record state-changing actions across Users, Projects, Tickets, and Comments.
- Capture authenticated user actors from JWT request context and preserve support for future `SYSTEM` audit actors.
- Implement `GET /audit-logs` with filters for `entityType`, `entityId`, `action`, and `actor`.

### Implementation Summary

- Added administrator-only Audit Logs API at `GET /audit-logs`.
- Added audit log query validation and response mapping.
- Added `AuditLogsService.record` for append-only state-change logging.
- Wired `AuditLogsModule` into `AppModule` and exported the audit service to domain modules.
- Updated Users, Projects, Tickets, and Comments controllers to pass `@CurrentUser()` into all mutation service methods.
- Updated Users, Projects, Tickets, and Comments services to record audit entries for create, update, and delete operations.
- Added explicit version fields to ticket and comment update DTOs.
- Updated ticket updates to compare the supplied version against the current row and execute the database update using `{ id, version }` criteria so stale writes fail safely.
- Updated comment updates to compare the supplied version against the current row and execute the database update using `{ id, ticketId, version }` criteria.
- Added `ConflictException` handling for stale ticket and comment update requests.
- Enforced ticket immutability when status is `DONE`.
- Enforced strict one-step ticket status transitions in lifecycle order.
- Added focused unit tests for ticket status rules and optimistic-lock update criteria.
- Added focused unit tests for comment optimistic-lock update criteria.

### Files Changed

- `prompts.md`
- `src/app.module.ts`
- `src/audit-logs/audit-logs.controller.ts`
- `src/audit-logs/audit-logs.module.ts`
- `src/audit-logs/audit-logs.service.ts`
- `src/audit-logs/dto/audit-log-query.dto.ts`
- `src/audit-logs/dto/audit-log-response.dto.ts`
- `src/users/users.controller.ts`
- `src/users/users.module.ts`
- `src/users/users.service.ts`
- `src/projects/projects.controller.ts`
- `src/projects/projects.module.ts`
- `src/projects/projects.service.ts`
- `src/tickets/dto/update-ticket.dto.ts`
- `src/tickets/tickets.controller.ts`
- `src/tickets/tickets.module.ts`
- `src/tickets/tickets.service.ts`
- `src/tickets/tickets.service.spec.ts`
- `src/comments/comments.controller.ts`
- `src/comments/comments.module.ts`
- `src/comments/comments.service.ts`
- `src/comments/comments.service.spec.ts`
- `src/comments/dto/update-comment.dto.ts`

### Business Rules Covered

- Ticket status changes are strictly limited to one forward lifecycle step:
  - `TODO -> IN_PROGRESS`
  - `IN_PROGRESS -> IN_REVIEW`
  - `IN_REVIEW -> DONE`
- Backward ticket status transitions are rejected.
- Skipped ticket status transitions are rejected.
- `DONE` tickets cannot be updated or soft-deleted.
- Ticket updates require an expected `version` value.
- Comment updates require an expected `version` value.
- Stale ticket updates return an informative `ConflictException`.
- Stale comment updates return an informative `ConflictException`.
- State-changing Users actions are audited:
  - Create.
  - Update.
  - Delete.
- State-changing Projects actions are audited:
  - Create.
  - Update.
  - Soft delete.
- State-changing Tickets actions are audited:
  - Create.
  - Update.
  - Soft delete.
- State-changing Comments actions are audited:
  - Create.
  - Update.
  - Delete.
- Audit logs capture action, entity type, entity ID, actor type, performer user ID, timestamp, and metadata.
- Audit log retrieval is ADMIN-only through `@Roles(UserRole.ADMIN)`.
- Audit log retrieval supports optional filters for `entityType`, `entityId`, `action`, and `actor`.

### Verification

- `npm run build` passed.
- `npm test -- --runInBand` passed.
- Focused tests added and passing:
  - Ticket stale-version update conflict.
  - Ticket `DONE` immutability.
  - Ticket skipped status transition rejection.
  - Ticket version-scoped update criteria.
  - Comment stale-version update conflict.
  - Comment version-scoped update criteria.

### Follow-ups

- Wire restore audit entries when Phase 5 soft-delete restore endpoints are implemented.
- Use `AuditActor.SYSTEM` for Phase 5 automated actions such as auto-assignment and auto-escalation.
- Add dependency-blocking checks before transition to `DONE` when ticket dependencies are implemented in Phase 5.

## Phase 5: Extended Features

### Prompt(s)

- Execute Phase 5: Extended Features exactly as detailed in `DEVELOPMENT_PLAN.md`.
- Add blocker validation logic to `TicketsService` so tickets cannot transition to `DONE` while blocked by unresolved tickets.
- Add case-insensitive mention extraction for `@username` patterns in ticket descriptions and comment text.
- Document detected mentions through service audit metadata.
- When a ticket transitions to `IN_PROGRESS` without an assignee, automatically assign it to the least-loaded developer candidate and record the action as `SYSTEM`.
- Implement a simulated or scheduled worker/service function that finds overdue unresolved tickets, bumps priority, sets overdue state, never changes status, and records `SYSTEM` audit entries.

### Implementation Summary

- Installed `@nestjs/schedule` and wired `ScheduleModule.forRoot()` in `AppModule`.
- Added `MentionParserService` for case-insensitive `@username` extraction with duplicate normalization.
- Added mention extraction to comment create/update audit metadata.
- Added mention extraction to ticket create/update audit metadata.
- Added unresolved dependency validation before a ticket can transition to `DONE`.
- Added least-loaded developer auto-assignment when an unassigned ticket transitions to `IN_PROGRESS`.
- Recorded auto-assignment audit entries with `actor = SYSTEM` and `action = AUTO_ASSIGN`.
- Added `TicketEscalationService` with both scheduled execution and callable `escalateOverdueTickets` function for simulation/testing.
- Implemented overdue ticket escalation for unresolved tickets with `dueDate` in the past.
- Escalation promotes priority one level, sets `isOverdue = true`, records `actor = SYSTEM`, and preserves ticket status.
- Added developer lookup support through `UsersService.findDevelopers`.
- Because no project-membership API exists yet, auto-assignment uses all `DEVELOPER` users as the candidate pool and calculates workload only from non-`DONE` tickets within the target project.

### Files Changed

- `package.json`
- `package-lock.json`
- `prompts.md`
- `src/app.module.ts`
- `src/users/users.service.ts`
- `src/comments/comments.module.ts`
- `src/comments/comments.service.ts`
- `src/comments/comments.service.spec.ts`
- `src/comments/mention-parser.service.ts`
- `src/comments/mention-parser.service.spec.ts`
- `src/tickets/tickets.module.ts`
- `src/tickets/tickets.service.ts`
- `src/tickets/tickets.service.spec.ts`
- `src/tickets/ticket-escalation.service.ts`
- `src/tickets/ticket-escalation.service.spec.ts`

### Business Rules Covered

- Tickets cannot transition to `DONE` if they have unresolved blocker tickets.
- Unresolved blockers are blocker tickets whose status is not `DONE`.
- Blocked `DONE` transitions throw `BadRequestException`.
- Mentions are extracted from comments and ticket descriptions with case-insensitive normalization.
- Mention metadata is captured in audit log metadata as `mentionedUsernames`.
- Auto-assignment runs when a ticket transitions to `IN_PROGRESS` and has no assignee.
- Auto-assignment chooses the `DEVELOPER` candidate with the lowest count of non-`DONE` tickets in the same project.
- Auto-assignment ties are broken by user registration order because developers are sorted by ascending user ID.
- If no developer candidates exist, the ticket remains unassigned.
- Auto-assignment audit logs use `actor = SYSTEM`.
- Auto-escalation only processes tickets with a past `dueDate` whose status is not `DONE`.
- Auto-escalation promotes priority by one level:
  - `LOW -> MEDIUM`
  - `MEDIUM -> HIGH`
  - `HIGH -> CRITICAL`
  - `CRITICAL -> CRITICAL`
- Auto-escalation sets `isOverdue = true`.
- Auto-escalation never changes ticket status.
- Auto-escalation audit logs use `actor = SYSTEM`.
- Critical overdue tickets with `isOverdue = true` are idempotent and are not repeatedly audited.

### Verification

- `npm run build` passed.
- `npm test -- --runInBand` passed.
- Local verification was completed by the project owner: Phase 5 compiled with 0 errors, including blockers, mentions, auto-assignment, and the auto-escalation worker.
- Focused tests added and passing:
  - Case-insensitive mention extraction and de-duplication.
  - Blocked `DONE` transition rejection.
  - Least-loaded developer auto-assignment on `IN_PROGRESS` transition.
  - SYSTEM audit record for auto-assignment.
  - Overdue priority escalation without status changes.
  - Idempotent critical overdue escalation behavior.

### Follow-ups

- Persist full mention associations and implement `GET /users/:userId/mentions` if completing the full PDF mention feature.
- Add ticket dependency management endpoints if completing the full ticket dependencies API.
- Add attachment upload/delete, CSV import/export, and deleted/restore endpoints from the broader Phase 5 plan if required in the next iteration.
- Replace the all-developers auto-assignment fallback with explicit project membership if a membership API/model is introduced.

## Phase 6: Testing and Documentation

### Prompt(s)

- Execute Phase 6: Testing and Documentation exactly as outlined in `DEVELOPMENT_PLAN.md`.
- Run the full test suite and ensure there are no regressions.
- Confirm that focused tests cover the rule preventing transition to `DONE` with unresolved blockers.
- Create a comprehensive `run.md` guide for evaluators with prerequisites, local setup, database startup, application startup, test commands, and table inspection tips.
- Finalize `prompts.md` as a complete development journey record and replace all remaining template entries.
- Merge final changes back into `main` and push the repository for submission readiness.

### Implementation Summary

- Added `run.md` at the repository root with evaluator-focused setup, run, test, and database verification instructions.
- Documented prerequisites including Node.js, npm, Docker, Docker Compose, and Git.
- Documented local setup with `npm install`, `.env` creation from `.env.example`, and PostgreSQL startup through `docker compose up -d db`.
- Documented application startup with `npm run start:dev`.
- Documented test and build commands with `npm test`, `npm test -- --runInBand`, and `npm run build`.
- Documented database inspection commands using `docker compose exec db psql`.
- Documented important generated columns and tables, including optimistic-locking columns, soft-delete columns, audit logs, and revoked tokens.
- Documented the assignment-specific default password behavior for users created without a password.
- Finalized this `prompts.md` Phase 6 section and replaced the remaining template text with final documentation.

### Files Changed

- `run.md`
- `prompts.md`

### Business Rules Covered

- Final test verification includes the focused service test proving a ticket cannot transition to `DONE` while unresolved blockers exist.
- Final test verification includes ticket optimistic-locking conflict coverage.
- Final test verification includes comment optimistic-locking conflict coverage.
- Final test verification includes `DONE` ticket immutability coverage.
- Final test verification includes illegal ticket status transition coverage.
- Final test verification includes SYSTEM actor audit coverage for auto-assignment and auto-escalation behavior.
- Documentation explains how to verify database-generated tables and important persistence columns.
- Documentation explains how to run the application and tests from a clean checkout.

### Verification

- Final verification commands:
  - `npm run build`
  - `npm test -- --runInBand`
- Both commands passed during Phase 6.
- Test suite coverage at final verification:
  - 5 test suites passed.
  - 12 tests passed.

### Follow-ups

- Repository is ready for evaluator pull and local execution using `run.md`.
- Remaining extended PDF features not implemented in this scoped build are documented in Phase 5 follow-ups: persisted mention associations, full dependency management endpoints, attachments, CSV import/export, and soft-delete restore endpoints.
- The assignment-compatible default password fallback remains documented as non-production behavior.
