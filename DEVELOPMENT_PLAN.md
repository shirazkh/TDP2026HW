# IssueFlow Development Plan

This plan translates the IssueFlow requirements into implementation phases for the current NestJS skeleton. The repository already includes NestJS, TypeORM, PostgreSQL driver dependencies, and `compose.yml` for a local PostgreSQL database, but it does not yet wire TypeORM into `AppModule` or define any domain modules/entities.

## Phase 1: Project Foundation, Database Configuration, and Entities

### Goals

- Wire the NestJS application to PostgreSQL through TypeORM.
- Define the persistence model for the full IssueFlow domain.
- Establish validation, serialization, and shared infrastructure patterns before feature work begins.

### Files to create or modify

- Modify:
  - `src/app.module.ts`
  - `src/main.ts`
  - `package.json`
  - `tsconfig.json` if path aliases or metadata settings need adjustment
  - `.env.example`
  - `README.md` only if the skeleton instructions conflict with implemented setup
- Create:
  - `src/config/database.config.ts`
  - `src/config/app.config.ts`
  - `src/common/enums/user-role.enum.ts`
  - `src/common/enums/ticket-status.enum.ts`
  - `src/common/enums/ticket-priority.enum.ts`
  - `src/common/enums/ticket-type.enum.ts`
  - `src/common/enums/audit-action.enum.ts`
  - `src/common/enums/audit-entity-type.enum.ts`
  - `src/common/enums/audit-actor.enum.ts`
  - `src/common/entities/base.entity.ts`
  - `src/users/user.entity.ts`
  - `src/projects/project.entity.ts`
  - `src/projects/project-member.entity.ts` if project membership is used to model "users linked to the project"
  - `src/tickets/ticket.entity.ts`
  - `src/comments/comment.entity.ts`
  - `src/comments/comment-mention.entity.ts`
  - `src/audit-logs/audit-log.entity.ts`
  - `src/tickets/ticket-dependency.entity.ts`
  - `src/attachments/attachment.entity.ts`
  - Optional TypeORM migration files under `src/migrations/`

### Checklist

- [ ] Add required infrastructure dependencies if they are not already installed, likely including:
  - [ ] `@nestjs/config`.
  - [ ] `@nestjs/jwt`.
  - [ ] `@nestjs/passport`.
  - [ ] `passport`.
  - [ ] `passport-jwt`.
  - [ ] Password hashing library such as `bcrypt`.
  - [ ] `@nestjs/schedule` for auto-escalation.
- [ ] Configure `TypeOrmModule.forRootAsync` or equivalent database bootstrap.
- [ ] Read database connection settings from environment variables with defaults matching `compose.yml`.
- [ ] Enable global validation pipes in `main.ts` with whitelist and transformation.
- [ ] Define TypeORM entities and relationships:
  - [ ] User to owned projects.
  - [ ] Project to eligible users/developers if project membership is introduced.
  - [ ] Project to tickets.
  - [ ] Ticket to project, assignee, comments, dependencies, attachments.
  - [ ] Comment to ticket, author, mentioned users.
  - [ ] Audit log records for state-changing actions.
- [ ] Add version columns for optimistic locking targets:
  - [ ] Tickets.
  - [ ] Comments.
- [ ] Add soft-delete support fields for:
  - [ ] Projects.
  - [ ] Tickets.
- [ ] Add due date and overdue fields to tickets:
  - [ ] `dueDate`.
  - [ ] `isOverdue`.
- [ ] Decide whether attachment binary data is stored on disk or in the database; persist enough metadata to satisfy the API contract.

### Business constraints to satisfy in this phase

- User role values must be limited to `ADMIN` and `DEVELOPER`.
- Ticket status values must be limited to `TODO`, `IN_PROGRESS`, `IN_REVIEW`, and `DONE`.
- Ticket priority values must be limited to `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`.
- Ticket type values must be limited to `BUG`, `FEATURE`, and `TECHNICAL`.
- Tickets belong to exactly one project.
- Comments belong to exactly one ticket and one author.
- Projects and tickets must support soft delete rather than permanent deletion through the API.
- Ticket and comment records must include a concurrency/version mechanism.

## Phase 2: Authentication, Authorization, and Request Context

### Goals

- Protect API endpoints with JWT authentication.
- Provide current-user lookup and logout behavior.
- Establish role-based authorization for ADMIN-only operations.

### Files to create or modify

- Modify:
  - `src/app.module.ts`
  - `src/users/user.entity.ts` if password or credential fields are added there
- Create:
  - `src/auth/auth.module.ts`
  - `src/auth/auth.controller.ts`
  - `src/auth/auth.service.ts`
  - `src/auth/dto/login.dto.ts`
  - `src/auth/guards/jwt-auth.guard.ts`
  - `src/auth/guards/roles.guard.ts`
  - `src/auth/decorators/current-user.decorator.ts`
  - `src/auth/decorators/roles.decorator.ts`
  - `src/auth/strategies/jwt.strategy.ts`
  - `src/auth/entities/revoked-token.entity.ts` if server-side logout deny-list is implemented
  - `src/common/interfaces/request-user.interface.ts`

### Checklist

- [ ] Resolve the credential model before implementation:
  - [ ] The PDF login endpoint requires a password.
  - [ ] The README user creation example does not include a password.
  - [ ] Choose and document whether user creation accepts a password, whether seeded users are used, or whether a default development password is applied.
- [ ] Implement `POST /auth/login`.
- [ ] Implement `POST /auth/logout`.
- [ ] Implement `GET /auth/me`.
- [ ] Add JWT module configuration and secret/expiry environment variables.
- [ ] Add request user extraction via a decorator.
- [ ] Add a deny-list or another explicit token invalidation strategy for logout.
- [ ] Apply authentication guards globally or consistently at every controller.
- [ ] Add role guard support for ADMIN-only endpoints.

### Business constraints to satisfy in this phase

- All API endpoints must be protected by JWT-based authentication.
- `POST /auth/login` accepts username and password and returns a signed access token.
- `POST /auth/logout` invalidates the current token using a deny-list or stateless expiry strategy.
- `GET /auth/me` returns the authenticated user's profile.
- Deleted-record listing and restore endpoints must be ADMIN-only when implemented.

## Phase 3: Core CRUD APIs

### Goals

- Implement the base REST APIs from the README contract for users, projects, tickets, and comments.
- Keep service methods small enough that later business rules can be layered in cleanly.

### Files to create or modify

- Modify:
  - `src/app.module.ts`
  - `src/app.controller.ts` if the root health endpoint should remain or be replaced
  - `src/app.service.ts` if the root service should remain or be replaced
- Create:
  - `src/users/users.module.ts`
  - `src/users/users.controller.ts`
  - `src/users/users.service.ts`
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
  - `src/common/filters/http-exception.filter.ts` if custom error formatting is needed

### Checklist

- [ ] Implement Users API:
  - [ ] `GET /users`.
  - [ ] `GET /users/:userId`.
  - [ ] `POST /users`.
  - [ ] `POST /users/update/:userId`.
  - [ ] `DELETE /users/:userId`.
- [ ] Implement Projects API:
  - [ ] `GET /projects`.
  - [ ] `GET /projects/:projectId`.
  - [ ] `POST /projects`.
  - [ ] `PATCH /projects/:projectId`.
  - [ ] `DELETE /projects/:projectId`.
- [ ] Implement Tickets API:
  - [ ] `GET /tickets?projectId=:projectId`.
  - [ ] `GET /tickets/:ticketId`.
  - [ ] `POST /tickets`.
  - [ ] `PATCH /tickets/:ticketId`.
  - [ ] `DELETE /tickets/:ticketId`.
- [ ] Implement Comments API:
  - [ ] `GET /tickets/:ticketId/comments`.
  - [ ] `POST /tickets/:ticketId/comments`.
  - [ ] `PATCH /tickets/:ticketId/comments/:commentId`.
  - [ ] `DELETE /tickets/:ticketId/comments/:commentId`.
- [ ] Return response shapes compatible with the README examples.
- [ ] Ensure normal project and ticket list/read endpoints hide soft-deleted records.

### Business constraints to satisfy in this phase

- User creation requires username, email, full name, and role.
- User updates are limited to full name and role.
- Project creation requires name, description, and owner user ID.
- Ticket creation requires title, description, status, priority, type, project ID, optional assignee ID, and optional due date.
- Ticket list endpoint returns only tickets for the requested project.
- Comment creation requires content and author ID.
- Invalid enum values and malformed input must be rejected with informative errors.
- Standard API reads must hide soft-deleted projects and tickets.

## Phase 4: Business Rules, State Machine, Audit Logging, and Concurrency

### Goals

- Implement the core rules that make IssueFlow more than CRUD.
- Centralize behavior that must be enforced consistently across manual and automatic actions.

### Files to create or modify

- Modify:
  - `src/tickets/tickets.service.ts`
  - `src/comments/comments.service.ts`
  - `src/projects/projects.service.ts`
  - `src/users/users.service.ts`
  - Relevant DTOs that need version or concurrency fields
- Create:
  - `src/tickets/ticket-state-machine.service.ts`
  - `src/tickets/ticket-concurrency.service.ts` if concurrency is separated from ticket updates
  - `src/comments/comment-concurrency.service.ts` if concurrency is separated from comment updates
  - `src/audit-logs/audit-logs.module.ts`
  - `src/audit-logs/audit-logs.controller.ts`
  - `src/audit-logs/audit-logs.service.ts`
  - `src/audit-logs/dto/audit-log-query.dto.ts`
  - `src/common/exceptions/business-rule.exception.ts` if domain-specific exceptions are useful

### Checklist

- [ ] Require or otherwise validate version information on ticket update requests.
- [ ] Require or otherwise validate version information on comment update requests.
- [ ] Reject stale ticket updates when another request has already changed the same ticket.
- [ ] Reject stale comment updates when another request has already changed the same comment.
- [ ] Enforce forward-only ticket status transitions.
- [ ] Reject updates to tickets already in `DONE`.
- [ ] Record audit log entries for all state-changing API actions.
- [ ] Record actor information as `USER` or `SYSTEM`.
- [ ] Implement `GET /audit-logs` with filters:
  - [ ] `entityType`.
  - [ ] `entityId`.
  - [ ] `action`.
  - [ ] `actor`.

### Business constraints to satisfy in this phase

- A ticket cannot be updated simultaneously by two or more users.
- Two users cannot edit a comment at the same time.
- Ticket status may only move forward: `TODO -> IN_PROGRESS -> IN_REVIEW -> DONE`.
- Backward ticket status transitions are not allowed.
- A ticket cannot be updated once it is `DONE`.
- All state-changing actions must be recorded in an append-only audit log.
- Audit logging must cover manually requested actions and automated system actions.
- Audit log retrieval must support unfiltered and filtered reads.

## Phase 5: Extended Ticket Features

### Goals

- Implement ticket dependencies, attachments, CSV import/export, soft-delete recovery, mentions, auto-escalation, and auto-assignment.
- Keep each extension behind a dedicated service boundary where practical.

### Files to create or modify

- Modify:
  - `src/tickets/tickets.controller.ts`
  - `src/tickets/tickets.service.ts`
  - `src/projects/projects.controller.ts`
  - `src/projects/projects.service.ts`
  - `src/comments/comments.service.ts`
  - `src/users/users.controller.ts`
  - `src/users/users.service.ts`
  - `src/audit-logs/audit-logs.service.ts`
- Create:
  - `src/tickets/dependencies.controller.ts` or dependency routes in `tickets.controller.ts`
  - `src/tickets/ticket-dependencies.service.ts`
  - `src/tickets/dto/add-ticket-dependency.dto.ts`
  - `src/attachments/attachments.module.ts`
  - `src/attachments/attachments.controller.ts`
  - `src/attachments/attachments.service.ts`
  - `src/tickets/ticket-export.service.ts`
  - `src/tickets/ticket-import.service.ts`
  - `src/tickets/dto/import-ticket-result.dto.ts`
  - `src/comments/mention-parser.service.ts`
  - `src/comments/comment-mentions.service.ts`
  - `src/users/dto/user-mentions-query.dto.ts`
  - `src/tickets/ticket-escalation.service.ts`
  - `src/tickets/ticket-escalation.scheduler.ts`
  - `src/tickets/ticket-assignment.service.ts`
  - `src/projects/project-workload.service.ts`
  - `src/projects/dto/project-workload-response.dto.ts`

### Checklist

- [ ] Implement Ticket Dependencies API:
  - [ ] `POST /tickets/:ticketId/dependencies`.
  - [ ] `GET /tickets/:ticketId/dependencies`.
  - [ ] `DELETE /tickets/:ticketId/dependencies/:blockerId`.
- [ ] Block transition to `DONE` when unresolved dependencies exist.
- [ ] Implement Attachments API:
  - [ ] `POST /tickets/:ticketId/attachments`.
  - [ ] `DELETE /tickets/:ticketId/attachments/:attachmentId`.
- [ ] Implement CSV export:
  - [ ] `GET /tickets/export?projectId=:projectId`.
- [ ] Implement CSV import:
  - [ ] `POST /tickets/import`.
  - [ ] Return `{ created, failed, errors }`.
- [ ] Implement soft-delete recovery APIs:
  - [ ] `GET /tickets/deleted?projectId=:projectId`.
  - [ ] `POST /tickets/:ticketId/restore`.
  - [ ] `GET /projects/deleted`.
  - [ ] `POST /projects/:projectId/restore`.
- [ ] Implement mentions:
  - [ ] Parse `@username` tokens case-insensitively.
  - [ ] Persist mention associations on comment creation.
  - [ ] Recalculate mention associations on comment update.
  - [ ] Include `mentionedUsers` in comment responses.
  - [ ] Implement `GET /users/:userId/mentions`.
- [ ] Implement auto-escalation:
  - [ ] Schedule recurring scan for overdue tickets with due dates.
  - [ ] Promote priority one level per escalation cycle.
  - [ ] Mark overdue critical tickets with `isOverdue = true`.
  - [ ] Record system audit logs for escalation actions.
- [ ] Implement auto-assignment:
  - [ ] Resolve how "DEVELOPER users linked to the project" are represented, because the README does not define a project-membership API.
  - [ ] If membership is not introduced, document the fallback candidate set, such as all `DEVELOPER` users.
  - [ ] Assign newly created unassigned tickets to least-loaded eligible developer.
  - [ ] Implement `GET /projects/:projectId/workload`.
  - [ ] Record system audit logs for auto-assignment.

### Business constraints to satisfy in this phase

- A ticket cannot transition to `DONE` if it has unresolved blocker tickets.
- Dependency tickets must both exist and belong to the same project.
- Attachment uploads larger than 10 MB must be rejected.
- Attachment uploads must allow only:
  - `image/png`.
  - `image/jpeg`.
  - `application/pdf`.
  - `text/plain`.
- CSV export must include `id`, `title`, `description`, `status`, `priority`, `type`, and `assigneeId`.
- CSV import must correctly handle commas and quotes inside field values.
- Tickets and projects must be soft-deleted only.
- Soft-deleted records are hidden from normal API responses.
- Listing deleted projects/tickets and restoring them must be ADMIN-only.
- Mentions are matched case-insensitively by username.
- Mention metadata must be included in comment responses as `{ id, username, fullName }`.
- User mention results must be newest first.
- Ticket creation and update accept optional `dueDate`.
- Escalation only applies to tickets with `dueDate` set.
- Overdue priority promotion order is `LOW -> MEDIUM -> HIGH -> CRITICAL`.
- Escalation is idempotent once a ticket is `CRITICAL`.
- A `CRITICAL` overdue ticket must expose `isOverdue = true`.
- Manual priority changes must clear `isOverdue` and reset escalation state.
- Escalation must not change ticket status.
- Auto-assignment only runs on ticket creation when `assigneeId` is absent.
- Only `DEVELOPER` users are eligible for auto-assignment.
- Workload is the count of non-`DONE` tickets assigned to a developer within the same project.
- Auto-assignment tie-breaking uses oldest user registration first.
- If no eligible or project-linked developer exists, the ticket remains unassigned without error.
- Explicit ticket reassignment through update must override auto-assignment.

## Phase 6: Testing, Documentation, and Submission Artifacts

### Goals

- Verify high-risk business behavior with focused automated tests.
- Provide clear setup and run documentation.
- Document AI usage as required by the assignment.

### Files to create or modify

- Modify:
  - `test/app.e2e-spec.ts`
  - Existing `*.spec.ts` files as modules are added
  - `README.md` only if final API notes are needed
- Create:
  - Unit tests beside services, for example:
    - `src/tickets/ticket-state-machine.service.spec.ts`
    - `src/tickets/ticket-assignment.service.spec.ts`
    - `src/tickets/ticket-escalation.service.spec.ts`
    - `src/comments/mention-parser.service.spec.ts`
  - E2E tests under `test/`, for example:
    - `test/users.e2e-spec.ts`
    - `test/projects.e2e-spec.ts`
    - `test/tickets.e2e-spec.ts`
    - `test/comments.e2e-spec.ts`
    - `test/auth.e2e-spec.ts`
  - `run.md`
  - `prompts.md`

### Checklist

- [ ] Add unit tests for enum validation and DTO validation where useful.
- [ ] Add unit tests for ticket state machine behavior.
- [ ] Add unit tests for concurrency/stale version rejection.
- [ ] Add unit tests for blocker checks before `DONE`.
- [ ] Add unit tests for mention parsing and mention synchronization.
- [ ] Add unit tests for auto-assignment workload selection and tie-breaking.
- [ ] Add unit tests for auto-escalation priority changes and idempotency.
- [ ] Add e2e tests for core happy paths:
  - [ ] Users.
  - [ ] Auth.
  - [ ] Projects.
  - [ ] Tickets.
  - [ ] Comments.
- [ ] Add e2e tests for high-risk failure paths:
  - [ ] Invalid enum input.
  - [ ] Backward ticket transition.
  - [ ] Update after `DONE`.
  - [ ] Stale version update.
  - [ ] Dependency blocking `DONE`.
  - [ ] Unauthorized or non-admin restore/deleted endpoints.
- [ ] Document setup in `run.md`:
  - [ ] Install dependencies.
  - [ ] Start PostgreSQL with `compose.yml`.
  - [ ] Configure environment variables.
  - [ ] Build the project.
  - [ ] Run the application.
  - [ ] Run unit and e2e tests.
- [ ] Document AI usage in `prompts.md`, including the model used.

### Business constraints to satisfy in this phase

- Tests must cover the key behaviors of the implementation.
- Documentation must include exact setup, build, run, and test steps.
- `prompts.md` must include the main and relevant prompts and explicitly state the model used.
- The final repository should be understandable and runnable from the documented steps.

## Cross-Cutting Implementation Notes

- Prefer TypeORM repositories and transactions for multi-entity operations such as ticket creation with auto-assignment, comment mention synchronization, imports, and audit logging.
- Use database transactions where a business action must update domain data and write audit logs together.
- Keep API responses aligned with README examples even when internal entity names use TypeScript conventions.
- Favor explicit service methods for business rules instead of placing rule-heavy logic in controllers.
- Use structured CSV libraries already listed in `package.json` instead of manual string splitting.
- Treat the README API table as the external contract and the PDF as the source of business constraints.
