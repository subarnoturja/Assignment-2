# DevPulse

> An internal tech issue & feature tracker for software teams — report bugs, suggest features, and coordinate resolutions.

**Live URL:** `https://devpulse.yourdomain.com`

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Error Handling](#error-handling)

---

## Features

- **JWT Authentication** — secure register and login with token-based sessions
- **Role-based access control** — `contributor` and `maintainer` roles with enforced permission rules
- **Issue management** — create, view, update, and delete bug reports and feature requests
- **Filtering & sorting** — filter issues by type or status; sort by newest or oldest
- **Contributor ownership rules** — contributors can only edit their own open issues
- **Maintainer privileges** — full control over all issues and independent status changes
- **System metrics endpoint** — maintainers can query live counts across users, issues, statuses, and types
- **Secure password storage** — bcrypt hashing with configurable salt rounds
- **Centralized error handling** — consistent error responses across the entire API

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js (LTS) | |
| Language | TypeScript | Strict mode, zero `any` types |
| Framework | Express.js | Modular router architecture |
| Database | NeonDB | Cloud Based Database |
| Query style | Raw SQL | `pool.query()` only |
| Authentication | jsonwebtoken | HS256 signed tokens |
| Passwords | bcrypt | Configurable salt rounds via env |
| Status codes | http-status-codes | Consistent HTTP status references |
| Config | dotenv | `.env` loaded at server startup |

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Clone the repository

```bash
git clone https://github.com/subarnoturja/Assignment-2.git
cd Assignment-2
```

### 2. Install dependencies

```bash
# Production dependencies
npm install express pg bcrypt jsonwebtoken dotenv cors http-status-codes

# Development dependencies
npm install -D typescript tsx ts-node-dev @types/node @types/express @types/bcrypt @types/jsonwebtoken
```

### 3. Configure TypeScript

Create `tsconfig.json` in the project root:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "module",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}

```

### 4. Start the server

```bash
# Development — live reload via ts-node-dev
npm run dev

# Production — compile then run
npm run build
npm start
```

The API will be available at `http://localhost:5000`.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | HTTP port the server listens on |
| `DATABASE_URL` | Yes | — | Full PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Secret key for signing tokens (use a long random string) |
| `BCRYPT_SALT_ROUNDS` | No | `10` | bcrypt work factor — must be between 8 and 12 |

**Example `.env`:**

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/devpulse
JWT_SECRET=your_super_secret_key_here
BCRYPT_SALT_ROUNDS=10
```

---

## API Endpoints

All responses follow a consistent envelope:

```json
{ "success": true,  "message": "...", "data": { ... } }
{ "success": false, "message": "...", "errors": { ... } }
```

The `Authorization` header carries the raw JWT token (no `Bearer` prefix):

```
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register a new user account |
| `POST` | `/api/auth/login` | Public | Log in and receive a JWT |

#### POST /api/auth/signup

```json
// Request body
{
  "name": "Jane Smith",
  "email": "jane@devpulse.com",
  "password": "securePassword123",
  "role": "contributor"
}

// 201 Created
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "name": "Jane Smith",
    "email": "jane@devpulse.com",
    "role": "contributor",
    "created_at": "2026-01-20T09:00:00Z",
    "updated_at": "2026-01-20T09:00:00Z"
  }
}
```

#### POST /api/auth/login

```json
// Request body
{
  "email": "jane@devpulse.com",
  "password": "securePassword123"
}

// 200 OK
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Jane Smith",
      "email": "jane@devpulse.com",
      "role": "contributor",
      "created_at": "2026-01-20T09:00:00Z",
      "updated_at": "2026-01-20T09:00:00Z"
    }
  }
}
```

---

### Issues — `/api/issues`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/issues` | Public | List all issues (supports filtering & sorting) |
| `GET` | `/api/issues/:id` | Public | Get a single issue by ID |
| `POST` | `/api/issues` | Authenticated | Create a new issue |
| `PATCH` | `/api/issues/:id` | Authenticated | Update an existing issue |
| `DELETE` | `/api/issues/:id` | Maintainer only | Permanently delete an issue |

#### GET /api/issues — Query Parameters

| Parameter | Accepted Values | Default | Description |
|---|---|---|---|
| `sort` | `newest`, `oldest` | `newest` | Order by creation date |
| `type` | `bug`, `feature_request` | — | Filter by issue type |
| `status` | `open`, `in_progress`, `resolved` | — | Filter by workflow status |

**Example:** `GET /api/issues?sort=oldest&type=bug&status=open`

```json
// 200 OK
{
  "success": true,
  "data": [
    {
      "id": 45,
      "title": "Database connection timeout under load",
      "description": "Pool exhausts after 50+ concurrent queries, causing 500 errors",
      "type": "bug",
      "status": "open",
      "reporter": {
        "id": 1,
        "name": "Jane Smith",
        "role": "contributor"
      },
      "created_at": "2026-01-20T10:30:00Z",
      "updated_at": "2026-01-20T10:30:00Z"
    }
  ]
}
```

> Reporter details are fetched without SQL JOINs — issues are queried first, then reporter data is retrieved in a single `WHERE id = ANY($1)` query and merged in application logic.

#### POST /api/issues

```json
// Request body
{
  "title": "Database connection timeout under load",
  "description": "Pool exhausts after 50+ concurrent queries, causing 500 errors",
  "type": "bug"
}

// 201 Created
{
  "success": true,
  "message": "Issue created successfully",
  "data": {
    "id": 45,
    "title": "Database connection timeout under load",
    "description": "Pool exhausts after 50+ concurrent queries, causing 500 errors",
    "type": "bug",
    "status": "open",
    "reporter_id": 1,
    "created_at": "2026-01-20T10:30:00Z",
    "updated_at": "2026-01-20T10:30:00Z"
  }
}
```

> `reporter_id` is extracted from the verified JWT — never accepted from the request body.

#### PATCH /api/issues/:id — Update Rules

Updatable fields: `title`, `description`, `type` — at least one is required.

| Role | Can update | Restriction |
|---|---|---|
| `maintainer` | Any issue, any field | None |
| `contributor` | Own issues only | Only while `status` is `open` |

Attempting to edit a non-open issue as a contributor returns `409 Conflict`.

---

## Database Schema

### `users` table

```sql
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(30)  NOT NULL,
  email      VARCHAR(40)  UNIQUE NOT NULL,
  password   TEXT         NOT NULL,
  role       VARCHAR(20)  NOT NULL DEFAULT 'contributor',
  created_at TIMESTAMP    DEFAULT NOW(),
  updated_at TIMESTAMP    DEFAULT NOW()
);
```

| Column | Type | Description |
|---|---|---|
| `id` | `SERIAL` | Auto-incrementing primary key |
| `name` | `VARCHAR(30)` | Full display name |
| `email` | `VARCHAR(40)` | Unique login address |
| `password` | `TEXT` | bcrypt-hashed — never returned in any response |
| `role` | `VARCHAR(20)` | `contributor` or `maintainer`, defaults to `contributor` |
| `created_at` | `TIMESTAMP` | Set automatically on insert |
| `updated_at` | `TIMESTAMP` | Updated on every row change |

### `issues` table

```sql
CREATE TABLE issues (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(50) NOT NULL,
  description TEXT         NOT NULL,
  type        VARCHAR(30)  NOT NULL,
  status      VARCHAR(30)  DEFAULT 'open',
  reporter_id INT          NOT NULL,
  created_at  TIMESTAMP    DEFAULT NOW(),
  updated_at  TIMESTAMP    DEFAULT NOW()
);
```

| Column | Type | Description |
|---|---|---|
| `id` | `SERIAL` | Auto-incrementing primary key |
| `title` | `VARCHAR(50)` | Short headline, max 150 characters |
| `description` | `TEXT` | Detailed explanation, min 20 characters |
| `type` | `VARCHAR(30)` | `bug` or `feature_request` |
| `status` | `VARCHAR(30)` | `open`, `in_progress`, or `resolved` — defaults to `open` |
| `reporter_id` | `INTEGER` | References the submitting user's `id` |
| `created_at` | `TIMESTAMP` | Set automatically on insert |
| `updated_at` | `TIMESTAMP` | Updated on every row change |

---

## Project Structure

```
src/
├── app.ts                        # Express app — middleware & route registration
├── server.ts                     # Entry point — starts HTTP server
│
├── config/
│   ├── index.ts                  # Environment variable validation
|
├── db/
│   ├── index.ts                  # Neon database connection 
│
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts    # Request handlers for signup & login
│   │   ├── auth.service.ts       # Business logic & DB queries
│   │   ├── auth.route.ts         # Route /api/auth/*
│   │   ├── auth.interface.ts     # IUser, ILoginUser types
│   │
│   └── issues/
│       ├── issue.controller.ts   # Request handlers for issue CRUD
│       ├── issue.service.ts      # Business logic & DB queries
│       ├── issue.route.ts        # Route /api/issues/*
│       ├── issue.interface.ts    # IIssue, IssueType, IssueStatus types
│
├── middleware/
│   ├── auth.ts                   # JWT verification + role guard via auth()
│
├── utils/
│   ├── sendResponse.ts           # Typed response envelope helper
│   ├── jwt.ts                    # createToken / verifyToken helpers
```

---

## Error Handling

All errors flow through the centralized `globalErrorHandler` middleware and return the standard envelope.

| Status Code | Meaning | When it occurs |
|---|---|---|
| `200 OK` | Success | Successful GET, PATCH, DELETE |
| `201 Created` | Resource created | Successful POST |
| `400 Bad Request` | Validation error | Missing fields, invalid values, duplicate email |
| `401 Unauthorized` | Authentication required | Missing, expired, or malformed JWT |
| `403 Forbidden` | Permission denied | Valid token but insufficient role |
| `404 Not Found` | Resource not found | Issue or route does not exist |
| `409 Conflict` | Business rule violation | Contributor editing a non-open issue |
| `500 Internal Server Error` | Unexpected error | Unhandled database or server failure |