# IssueFlow Run Guide

This guide explains how to install, configure, run, and verify the IssueFlow NestJS backend locally.

## Prerequisites

- Node.js 20.x or newer
- npm 10.x or newer
- Docker and Docker Compose
- Git
- A shell with access to the repository root

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

3. Review `.env`. The default database settings match `compose.yml`:

   ```text
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=issueflow
   DB_PASSWORD=issueflow
   DB_NAME=issueflow
   TYPEORM_SYNCHRONIZE=true
   ```

   `TYPEORM_SYNCHRONIZE=true` is intentional for this assignment so the local database schema is generated automatically during development startup.

4. Start PostgreSQL:

   ```bash
   docker compose up -d db
   ```

5. Start the application in development mode:

   ```bash
   npm run start:dev
   ```

   The API listens on `http://localhost:3000` by default.

## Running Tests

Run the unit test suite:

```bash
npm test
```

Run tests serially, which is useful in CI-like environments:

```bash
npm test -- --runInBand
```

Build the project:

```bash
npm run build
```

## Database Verification Tips

After starting PostgreSQL and the NestJS application, TypeORM should generate the tables automatically.

List generated tables:

```bash
docker compose exec db psql -U issueflow -d issueflow -c "\dt"
```

Inspect important columns:

```bash
docker compose exec db psql -U issueflow -d issueflow -c "\d tickets"
docker compose exec db psql -U issueflow -d issueflow -c "\d comments"
docker compose exec db psql -U issueflow -d issueflow -c "\d projects"
docker compose exec db psql -U issueflow -d issueflow -c "\d audit_logs"
docker compose exec db psql -U issueflow -d issueflow -c "\d attachments"
docker compose exec db psql -U issueflow -d issueflow -c "\d comment_mentions"
```

Expected highlights:

- `tickets.version` and `comments.version` support optimistic locking.
- `tickets.deleted_at` and `projects.deleted_at` support soft delete.
- `audit_logs` stores append-only state-change records.
- `revoked_tokens` stores hashed revoked JWT tokens for logout.
- `attachments` stores ticket attachment metadata and file data.
- `comment_mentions` stores persisted comment-to-user mention associations.

## Authentication Notes

All endpoints are protected by JWT authentication except `POST /auth/login`.

The assignment README user creation contract does not include a password field, while `/auth/login` requires credentials. To preserve that contract, users created without an explicit password receive the hashed fallback password:

```text
Password123!
```

This fallback is documented as an assignment compatibility decision and is not a production credential strategy.

Typical local flow:

1. Create a user through `POST /users` while authenticated, or insert/seed a user.
2. Log in:

   ```http
   POST /auth/login
   Content-Type: application/json

   {
     "username": "jdoe",
     "password": "Password123!"
   }
   ```

3. Use the returned token:

   ```http
   Authorization: Bearer <accessToken>
   ```

## Stopping the Database

Stop PostgreSQL:

```bash
docker compose down
```

To remove containers and volumes if you created persistent data manually:

```bash
docker compose down -v
```
